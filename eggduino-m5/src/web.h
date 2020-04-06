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
    Web(FS &fs, String rootPath = "/eggbot", uint16_t port = 80);
    void begin(Motion &motion, Printer &printer);

private:
    FS &_fs;
    String _rootPath;
    AsyncWebServer _server;
    fs::File uploadFile;
};

#endif
