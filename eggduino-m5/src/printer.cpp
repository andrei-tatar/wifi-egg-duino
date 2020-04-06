#include "printer.h"

Printer::Printer(Motion &motion) : motion(motion)
{
}

void Printer::stop()
{
    if (printing)
    {
        printing->close();
        delete printing;
        printing = NULL;
    }
    waiting = 0;
}

void Printer::print(fs::File file)
{
    stop();
    printing = new File(file);
}

void Printer::processNextCommand()
{
    while (printing && printing->available())
    {
        char buffer[31];
        auto read = printing->readBytesUntil('\n', buffer, 30);
        if (!read)
        {
            continue;
        }
        buffer[read] = 0;

        if (strcmp(buffer, "P0") == 0)
        {
            motion.penUp();
        }
        else if (strcmp(buffer, "P1") == 0)
        {
            motion.penDown();
        }
        else if (strcmp(buffer, "M1") == 0)
        {
            motion.enableMotors();
        }
        else if (strcmp(buffer, "M0") == 0)
        {
            motion.disableMotors();
        }
        else if (buffer[0] == 'Z' && progressHandler)
        {
            uint8_t progress = atoi(&buffer[2]);
            progressHandler(progress);
        }
        else if (buffer[0] == 'S' && pauseHandler)
        {
            waiting = true;
            lastPenPosition = motion.getPenPosition();
            motion.setPenPosition(0);
            pauseHandler(&buffer[2]);
            return;
        }
        else if (strcmp(buffer, "H") == 0)
        {
            motion.travelHome();
            return;
        }
        else if (buffer[0] == 'T')
        {
            auto x = atol(&buffer[2]);
            auto y = atol(strchr(&buffer[2], ' '));

            motion.travelAbsolute(x, y);
            return;
        }
    }

    stop();
}

void Printer::onPause(PrinterPauseHandler handler)
{
    pauseHandler = handler;
}

void Printer::onProgress(PrinterProgressHandler handler)
{
    progressHandler = handler;
}

void Printer::continuePrint()
{
    if (waiting)
    {
        motion.setPenPosition(lastPenPosition);
        waiting = false;
    }
}

void Printer::update()
{
    if (printing && !motion.update() && !waiting)
    {
        processNextCommand();
    }
}