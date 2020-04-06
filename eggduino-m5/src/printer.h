#ifndef PRINTER_H
#define PRINTER_H

#include "motion.h"
#include "FS.h"

typedef std::function<void(String waitingFor)> PrinterPauseHandler;
typedef std::function<void(uint8_t percentage)> PrinterProgressHandler;

class Printer
{
public:
    Printer(Motion &motion);

    void print(File file);
    void stop();
    void update();
    void continuePrint();
    void onPause(PrinterPauseHandler handler);
    void onProgress(PrinterProgressHandler handler);
    bool isPrinting() { return printing ? true : false; }

private:
    void processNextCommand();

    bool waiting;
    long lastPenPosition;
    uint8_t progress;
    File *printing;
    Motion &motion;
    PrinterPauseHandler pauseHandler;
    PrinterProgressHandler progressHandler;
};

#endif
