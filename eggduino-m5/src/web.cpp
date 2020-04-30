#include <SPIFFS.h>
#include "web.h"
#include "esp_wifi.h"
#include <Update.h>

const String extension = ".egg";

Web::Web(FS &fs, Printer &printer, String rootPath, uint16_t port)
    : _fs(fs),
      _printer(printer),
      _rootPath(rootPath),
      _server(port),
      _ws("/api/ws")
{
}

void Web::begin()
{
    SPIFFS.begin();
    _fs.mkdir(_rootPath);

    _server.on("/api/print/*", HTTP_POST, std::bind(&Web::handlePrint, this, std::placeholders::_1));
    _server.on("/api/command", HTTP_POST, std::bind(&Web::handlePrinterCommand, this, std::placeholders::_1));

    _server.on("/api/wifi/scan", HTTP_GET, std::bind(&Web::handleWifiScan, this, std::placeholders::_1));
    _server.on("/api/wifi/connect", HTTP_POST, std::bind(&Web::handleWifiConnect, this, std::placeholders::_1));
    _server.on("/api/wifi", HTTP_GET, std::bind(&Web::handleWifiStatus, this, std::placeholders::_1));

    _server.on("/api/motion", HTTP_PATCH, std::bind(&Web::handleUpdateMotionParams, this, std::placeholders::_1));
    _server.on("/api/motion", HTTP_GET, std::bind(&Web::handleGetMotionParams, this, std::placeholders::_1));

    _server.on("/api/files", HTTP_GET, std::bind(&Web::handleFilesList, this, std::placeholders::_1));
    _server.on("/api/file", HTTP_POST,
               std::bind(&Web::handleFilesUploadResponse, this, std::placeholders::_1),
               std::bind(&Web::handleFileUploadBody, this,
                         std::placeholders::_1, std::placeholders::_2,
                         std::placeholders::_3, std::placeholders::_4,
                         std::placeholders::_5, std::placeholders::_6));
    _server.on("/api/file/*", HTTP_GET | HTTP_DELETE, std::bind(&Web::handleFileGetDelete, this, std::placeholders::_1));

    _server.on("/api/config", HTTP_GET, std::bind(&Web::handleConfigGet, this, std::placeholders::_1));
    _server.on(
        "/api/config", HTTP_POST, [](AsyncWebServerRequest *req) {},
        NULL,
        std::bind(&Web::handleConfigUpdate, this,
                  std::placeholders::_1, std::placeholders::_2,
                  std::placeholders::_3, std::placeholders::_4,
                  std::placeholders::_5));

    _server.on("/api/update", HTTP_POST,
               std::bind(&Web::handleUpdateResponse, this, std::placeholders::_1),
               std::bind(&Web::handleUpdateBody, this,
                         std::placeholders::_1, std::placeholders::_2,
                         std::placeholders::_3, std::placeholders::_4,
                         std::placeholders::_5, std::placeholders::_6));

    _server.on("/api/reboot", HTTP_POST, [this](AsyncWebServerRequest *req) {
        AsyncWebServerResponse *response = req->beginResponse(200, "text/plain", "OK");
        response->addHeader("Connection", "close");
        req->send(response);

        delay(1000);
        ESP.restart();
    });

    _server.serveStatic("/", SPIFFS, "/", "public,max-age=3600,immutable");
    _server.addHandler(&_ws);
    _server.onNotFound([](AsyncWebServerRequest *req) {
        req->send(SPIFFS, "/index.html");
    });

    _ws.onEvent([this](AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
        if (type == WS_EVT_CONNECT)
        {
            client->text(getStatusJson());
        }
        else if (type == WS_EVT_DATA)
        {
            if (len == 8 && strncmp("__ping__", (const char *)data, 8) == 0)
            {
                client->text("__pong__");
            }
        }
    });

    _server.begin();

    _printer.onProgressChanged([this]() {
        char buff[20];
        snprintf(buff, sizeof(buff), "{\"progress\":%lu}", _printer.getPrintedLines());
        _ws.textAll(buff);
    });

    _printer.onStatusChanged([this]() {
        _ws.textAll(getStatusJson());
    });
}

String Web::getStatusJson()
{
    char buff[200];
    if (_printer.isPrinting())
    {
        String fileName = _printer.printingFileName();
        fileName = fileName.substring(_rootPath.length() + 1, fileName.length() - extension.length());
        if (_printer.isPaused())
        {
            snprintf(buff, sizeof(buff), "{\"status\":\"paused\",\"waitingFor\":\"%s\",\"fileName\":\"%s\",\"progress\":%lu}",
                     _printer.getWaitingFor().c_str(),
                     fileName.c_str(),
                     _printer.getPrintedLines());
        }
        else
        {
            snprintf(buff, sizeof(buff), "{\"status\":\"printing\",\"fileName\":\"%s\",\"progress\":%lu}",
                     fileName.c_str(),
                     _printer.getPrintedLines());
        }
    }
    else
    {
        snprintf(buff, sizeof(buff), "{\"status\":\"stopped\"}");
    }

    return String(buff);
}

String Web::statusToString(wl_status_t status)
{
    switch (status)
    {
    case WL_IDLE_STATUS:
        return "idle";
    case WL_NO_SSID_AVAIL:
        return "no_network";
    case WL_SCAN_COMPLETED:
        return "scan_completed";
    case WL_CONNECTED:
        return "connected";
    case WL_CONNECT_FAILED:
        return "connect_failed";
    case WL_CONNECTION_LOST:
        return "connection_lost";
    case WL_DISCONNECTED:
        return "disconnected";
    default:
        return "unknown";
    }
}

void Web::handlePrint(AsyncWebServerRequest *req)
{
    if (_printer.isPrinting())
    {
        req->send(400);
        return;
    }

    String path = _rootPath + "/" + req->url().substring(11) + extension;
    if (_fs.exists(path))
    {
        File file = _fs.open(path);
        _printer.print(file);
        req->send(200);
        _ws.textAll(getStatusJson());
    }
    else
    {
        req->send(404);
    }
}

void Web::handleWifiScan(AsyncWebServerRequest *req)
{
    int count = WiFi.scanNetworks();
    String json = "[";
    for (auto i = 0; i < count; i++)
    {
        char network[150];
        snprintf(network, sizeof(network), "{\"ssid\":\"%s\",\"encryptionType\":%d,\"rssi\":%d,\"channel\":%d,\"bssid\":\"%s\"}%s",
                 WiFi.SSID(i).c_str(), WiFi.encryptionType(i), WiFi.RSSI(i), WiFi.channel(i), WiFi.BSSIDstr(i).c_str(), i == count - 1 ? "" : ",");
        json += network;
    }
    json += "]";
    req->send(200, "application/json", json);
}

void Web::handleWifiConnect(AsyncWebServerRequest *req)
{
    if (req->hasParam("ssid", true) && req->hasParam("password", true) && req->hasParam("bssid", true))
    {
        auto bssidStr = req->getParam("bssid", true)->value();
        uint8_t bssid[6];
        uint8_t length = std::min(18, (int)bssidStr.length());
        for (auto i = 0; i < length; i += 3)
        {
            char msb = bssidStr[i], lsb = bssidStr[i + 1];
            msb -= msb >= 'A' ? 'A' - 10 : '0';
            lsb -= lsb >= 'A' ? 'A' - 10 : '0';
            bssid[i / 3] = msb * 16 + lsb;
        }

        auto result = WiFi.begin(
            req->getParam("ssid", true)->value().c_str(),
            req->getParam("password", true)->value().c_str(),
            0,
            bssid);

        if (result == WL_CONNECTED)
        {
            req->send(200);
        }
        else
        {
            char json[150];
            snprintf(json, sizeof(json), "{\"error\": \"%s\"}", statusToString(result).c_str());
            req->send(400, "application/json", json);
        }
    }
    req->send(400);
}

void Web::handleWifiStatus(AsyncWebServerRequest *req)
{
    char json[500];
    snprintf(json, sizeof(json), "{"
                                 "\"status\":\"%s\","
                                 "\"ssid\":\"%s\","
                                 "\"bssid\":\"%s\""
                                 "}",
             statusToString(WiFi.status()).c_str(),
             WiFi.SSID().c_str(),
             WiFi.BSSIDstr().c_str());
    req->send(200, "application/json", json);
}

void Web::handlePrinterCommand(AsyncWebServerRequest *req)
{
    if (req->hasParam("command", true))
    {
        auto cmd = req->getParam("command", true)->value();
        if (cmd.equals("pen-up"))
            _printer.penUp();
        else if (cmd.equals("pen-down"))
            _printer.penDown();
        else if (cmd.equals("motors-enable"))
            _printer.enableMotors();
        else if (cmd.equals("motors-disable"))
            _printer.disableMotors();
        else if (cmd.equals("print-continue"))
            _printer.continuePrint();
        else if (cmd.equals("print-stop"))
            _printer.stop();
        else if (cmd.equals("print-pause"))
            _printer.pause();
    }
    req->send(200);
}

void Web::handleUpdateMotionParams(AsyncWebServerRequest *req)
{
    MotionParameters params;
    _printer.getParameters(params);

    if (req->hasParam("penUpPercent", true))
    {
        params.penUpPercent = req->getParam("penUpPercent", true)->value().toInt();
    }
    if (req->hasParam("penDownPercent", true))
    {
        params.penDownPercent = req->getParam("penDownPercent", true)->value().toInt();
    }
    if (req->hasParam("drawingSpeed", true))
    {
        params.drawingSpeed = req->getParam("drawingSpeed", true)->value().toInt();
    }
    if (req->hasParam("penMoveDelay", true))
    {
        params.penMoveDelay = req->getParam("penMoveDelay", true)->value().toInt();
    }
    if (req->hasParam("travelSpeed", true))
    {
        params.travelSpeed = req->getParam("travelSpeed", true)->value().toInt();
    }
    if (req->hasParam("stepsPerRotation", true))
    {
        params.stepsPerRotation = req->getParam("stepsPerRotation", true)->value().toInt();
    }
    if (req->hasParam("reversePen", true))
    {
        params.reversePen = req->getParam("reversePen", true)->value().equals("true");
    }
    if (req->hasParam("reverseRotation", true))
    {
        params.reverseRotation = req->getParam("reverseRotation", true)->value().equals("true");
    }
    _printer.setParameters(params);
    req->send(200);
}

void Web::handleGetMotionParams(AsyncWebServerRequest *req)
{
    MotionParameters params;
    _printer.getParameters(params);

    char response[200];
    snprintf(response, sizeof(response),
             "{\"penUpPercent\":%d,\"penDownPercent\":%d,\"drawingSpeed\":%d,\"penMoveDelay\":%d,"
             "\"travelSpeed\":%d,\"stepsPerRotation\":%d,\"reversePen\":%s,\"reverseRotation\":%s}",
             params.penUpPercent, params.penDownPercent, params.drawingSpeed, params.penMoveDelay,
             params.travelSpeed, params.stepsPerRotation,
             params.reversePen ? "true" : "false",
             params.reverseRotation ? "true" : "false");

    req->send(200, "application/json", response);
}

void Web::handleFilesList(AsyncWebServerRequest *req)
{
    File dir = _fs.open(_rootPath);
    if (!dir || !dir.isDirectory())
    {
        req->send(500, "application/json", "{\"error\":\"no_card\"}");
        return;
    }

    String output = "[";
    auto skip = _rootPath.length() + 1;
    while (File file = dir.openNextFile())
    {
        auto fileName = String(file.name());

        if (!fileName.endsWith(extension))
            continue;

        if (output != "[")
        {
            output += ',';
        }
        output += "{\"name\":\"";
        output += fileName.substring(skip, fileName.length() - extension.length());
        output += "\"}";
    }
    output += "]";
    req->send(200, "application/json", output);
}

void Web::handleFilesUploadResponse(AsyncWebServerRequest *req)
{
    if (req->_tempFile)
    {
        req->_tempFile.close();
        req->send(201);
    }
    else
    {
        req->send(400);
    }
}

void Web::handleFileUploadBody(AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final)
{
    if (!index)
    {
        String path = _rootPath + "/" + filename + extension;
        if (!_fs.exists(path))
        {
            auto file = _fs.open(path, "w");
            request->_tempFile = file;
        }
    }
    if (len && request->_tempFile)
    {
        request->_tempFile.write(data, len);
    }
}

void Web::handleFileGetDelete(AsyncWebServerRequest *req)
{
    String path = _rootPath + "/" + req->url().substring(10) + extension;
    if (req->method() == HTTP_GET)
    {
        req->send(_fs, path);
    }
    else
    {
        if (!_fs.exists(path))
        {
            return req->send(404);
        }
        _fs.remove(path);
        req->send(200);
    }
}

void Web::handleConfigGet(AsyncWebServerRequest *req)
{
    req->send(_fs, _rootPath + "/config.json");
}

void Web::handleConfigUpdate(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total)
{
    auto file = _fs.open(_rootPath + "/config.json", "w");
    file.write(data, len);
    file.close();
    request->send(200, "application/json", "{}");
}

void Web::handleUpdateResponse(AsyncWebServerRequest *req)
{
    char json[150];
    snprintf(json, sizeof(json), "{\"status\":\"%s\"}", Update.errorString());
    req->send(Update.hasError() ? 500 : 200, "application/json", json);

    if (Update.hasError())
    {
        Update.clearError();
        Update.abort();
    }
}

void Web::handleUpdateBody(AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final)
{
    if (!index)
    {
        if (filename.indexOf("spiffs") >= 0)
        {
            Update.begin(UPDATE_SIZE_UNKNOWN, U_SPIFFS);
        }
        else
        {
            Update.begin(UPDATE_SIZE_UNKNOWN, U_FLASH);
        }
    }

    if (len)
    {
        Update.write(data, len);
    }

    if (final)
    {
        Update.end(true);
    }
}
