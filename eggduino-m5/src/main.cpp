#include <Arduino.h>
#include <M5Stack.h>
#include "Free_Fonts.h"
#include <ESPAsyncWebServer.h>

AsyncWebServer server(80);
const String rootPath = "/eggbot";
const String extension = ".egg";
fs::File uploadFile;
#define FS SD

void setup()
{
  WiFi.begin();

  M5.begin();
  M5.Lcd.setBrightness(0);

  SPIFFS.begin();

  FS.begin();
  FS.mkdir(rootPath);

  server.on("/api/files", HTTP_GET, [](AsyncWebServerRequest *req) {
    File dir = FS.open(rootPath);
    if (!dir || !dir.isDirectory())
    {
      req->send(500, "text/json", "{\"error\":\"no_card\"}");
      return;
    }

    String output = "[";
    auto skip = rootPath.length() + 1;
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

  server.on(
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
      [](AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final) {
        if (!index)
        {
          String path = rootPath + "/" + filename + extension;
          if (!FS.exists(path))
          {
            auto file = FS.open(path, "w");
            request->_tempFile = file;
          }
        }
        if (len && request->_tempFile)
        {
          request->_tempFile.write(data, len);
        }
      });

  server.on("/api/file/*", HTTP_GET | HTTP_DELETE, [](AsyncWebServerRequest *req) {
    String path = rootPath + "/" + req->url().substring(10) + extension;
    if (req->method() == HTTP_GET)
    {
      req->send(FS, path);
    }
    else
    {
      if (!FS.exists(path))
      {
        return req->send(404);
      }
      FS.remove(path);
      req->send(200);
    }
  });

  server.serveStatic("/", SPIFFS, "/client");

  server.onNotFound([](AsyncWebServerRequest *req) {
    req->send(SPIFFS, "/client/index.html");
  });

  server.begin();
}

void loop()
{
  M5.update();
}