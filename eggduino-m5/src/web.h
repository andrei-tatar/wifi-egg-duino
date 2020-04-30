#ifndef WEB_H
#define WEB_H

#include <ESPAsyncWebServer.h>
#include <Arduino.h>
#include <FS.h>

#include "printer.h"

class Web
{
public:
    Web(FS &fs, Printer &printer, String rootPath = "/eggbot", uint16_t port = 80);
    void begin();

private:
    String getStatusJson();

    void handlePrint(AsyncWebServerRequest *req);
    void handlePrinterCommand(AsyncWebServerRequest *req);

    void handleWifiScan(AsyncWebServerRequest *req);
    void handleWifiConnect(AsyncWebServerRequest *req);
    void handleWifiStatus(AsyncWebServerRequest *req);

    void handleUpdateMotionParams(AsyncWebServerRequest *req);
    void handleGetMotionParams(AsyncWebServerRequest *req);

    void handleFilesList(AsyncWebServerRequest *req);
    void handleFilesUploadResponse(AsyncWebServerRequest *req);
    void handleFileUploadBody(AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final);
    void handleFileGetDelete(AsyncWebServerRequest *req);

    void handleConfigGet(AsyncWebServerRequest *req);
    void handleConfigUpdate(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total);

    void handleUpdateResponse(AsyncWebServerRequest *req);
    void handleUpdateBody(AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final);

    String statusToString(wl_status_t status);

    FS &_fs;
    Printer &_printer;
    String _rootPath;
    AsyncWebServer _server;
    AsyncWebSocket _ws;
    fs::File uploadFile;
};

#endif
