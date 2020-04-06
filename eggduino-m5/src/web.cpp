#include <SPIFFS.h>
#include "web.h"

const String extension = ".egg";

Web::Web(FS &fs, String rootPath, uint16_t port)
    : _fs(fs),
      _rootPath(rootPath),
      _server(port)
{
}

void Web::begin(Motion &motion, Printer &printer)
{
    _fs.mkdir(_rootPath);
    _server.begin();

    _server.on("/api/print/*", HTTP_POST,
               [this, &printer](AsyncWebServerRequest *req) {
                   if (printer.isPrinting())
                   {
                       req->send(400);
                       return;
                   }

                   String path = _rootPath + "/" + req->url().substring(11) + extension;
                   if (_fs.exists(path))
                   {
                       File file = _fs.open(path);
                       printer.print(file);
                       req->send(200);
                   }
                   else
                   {
                       req->send(404);
                   }
               });

    _server.on("/api/command", HTTP_POST, [this, &motion](AsyncWebServerRequest *req) {
        if (req->hasParam("command", true))
        {
            auto cmd = req->getParam("command", true)->value();
            if (cmd.equals("pen-up"))
                motion.penUp();
            else if (cmd.equals("pen-down"))
                motion.penDown();
            else if (cmd.equals("motors-enable"))
                motion.enableMotors();
            else if (cmd.equals("motors-disable"))
                motion.disableMotors();
        }
        req->send(200);
    });

    _server.on("/api/motion", HTTP_PATCH, [this, &motion](AsyncWebServerRequest *req) {
        MotionParameters params;
        motion.getParameters(params);

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
        motion.setParameters(params);
        req->send(200);
    });

    _server.on("/api/motion", HTTP_GET, [this, &motion](AsyncWebServerRequest *req) {
        MotionParameters params;
        motion.getParameters(params);
        String response = "{";
        response += "\"penUpPercent\":";
        response += params.penUpPercent;
        response += ", \"penDownPercent\":";
        response += params.penDownPercent;
        response += ", \"drawingSpeed\":";
        response += params.drawingSpeed;
        response += ", \"penMoveDelay\":";
        response += params.penMoveDelay;
        response += ", \"travelSpeed\":";
        response += params.travelSpeed;
        response += ", \"stepsPerRotation\":";
        response += params.stepsPerRotation;
        response += ", \"reversePen\":";
        response += params.reversePen ? "true" : "false";
        response += ", \"reverseRotation\":";
        response += params.reverseRotation ? "true" : "false";
        response += "}";

        req->send(200, "application/json", response);
    });

    _server.on("/api/files", HTTP_GET, [this](AsyncWebServerRequest *req) {
        File dir = _fs.open(_rootPath);
        if (!dir || !dir.isDirectory())
        {
            req->send(500, "text/json", "{\"error\":\"no_card\"}");
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
        req->send(200, "text/json", output);
    });

    _server.on(
        "/api/file", HTTP_POST,
        [](AsyncWebServerRequest *req) {
            if (req->_tempFile)
            {
                req->_tempFile.close();
                req->send(201);
            }
            else
            {
                req->send(400);
            }
        },
        [this](AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final) {
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
        });

    _server.on("/api/file/*", HTTP_GET | HTTP_DELETE,
               [this](AsyncWebServerRequest *req) {
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
               });

    _server.on(
        "/api/config", HTTP_GET,
        [this](AsyncWebServerRequest *req) {
            req->send(_fs, _rootPath + "/config.json");
        });

    _server.on(
        "/api/config", HTTP_POST,
        [](AsyncWebServerRequest *request) {},
        NULL,
        [this](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
            auto file = _fs.open(_rootPath + "/config.json", "w");
            file.write(data, len);
            file.close();
            request->send(200, "application/json", "{}");
        });

    SPIFFS.begin();
    _server.serveStatic("/", SPIFFS, "/client");

    _server.onNotFound([](AsyncWebServerRequest *req) {
        req->send(SPIFFS, "/client/index.html");
    });
}