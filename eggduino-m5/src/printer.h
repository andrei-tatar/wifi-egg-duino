#ifndef PRINTER_H
#define PRINTER_H

#include "motion.h"
#include "FS.h"

typedef std::function<void(String waitingFor)> PrinterPauseHandler;

class Printer
{
public:
    Printer(Motion &motion);

    void print(File file);
    void stop();
    void update();
    void continuePrint();
    void onPause(PrinterPauseHandler handler);
    bool isPrinting() { return printing ? true : false; }
    const char *printingFileName() { return printing->name(); }
    const uint8_t getProgress() { return progress; }

private:
    void processNextCommand();

    bool waiting;
    long lastPenPosition;
    uint8_t progress;
    File *printing;
    Motion &motion;
    PrinterPauseHandler pauseHandler;
};

#endif
