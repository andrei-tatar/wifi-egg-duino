#ifndef WEB_H
#define WEB_H

#include <ESPAsyncWebServer.h>
#include <Arduino.h>
#include <FS.h>

#include "motion.h"
#include "printer.h"

class Web
{
public:
    Web(FS &fs, Motion &motion, Printer &printer, String rootPath = "/eggbot", uint16_t port = 80);
    void begin();

private:
    String getStatusJson();

    FS &_fs;
    Motion &_motion;
    Printer &_printer;
    String _rootPath;
    AsyncWebServer _server;
    AsyncWebSocket _ws;
    fs::File uploadFile;
};

#endif
