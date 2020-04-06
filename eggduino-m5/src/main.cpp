#include <Arduino.h>
#include <M5Stack.h>
#include <WiFi.h>

#include "web.h"
#include "motion.h"
#include "printer.h"
#include "Free_Fonts.h"

Web web(SD);
Motion motion;
Printer printer(motion);

void setup()
{
  WiFi.begin();
  M5.begin();
  M5.Lcd.setFreeFont(FSS12);
  M5.Lcd.println();

  printer.onPause([](String waitFor) {
    M5.Lcd.clear();
    M5.Lcd.println("Waiting for");
    M5.Lcd.println(waitFor);
    M5.Speaker.beep();
  });

  printer.onProgress([](uint8_t percentage) {
    M5.Lcd.progressBar(0, 0, M5.Lcd.width(), 10, percentage);
  });

  motion.begin();
  web.begin(motion, printer);

  uint8_t count = 0;
  while (WiFi.status() != WL_CONNECTED && count < 30)
  {
    M5.Lcd.print(".");
    delay(500);
    count++;
  }
  M5.Lcd.println(WiFi.localIP());
}

void loop()
{
  M5.update();
  printer.update();

  if (M5.BtnA.wasPressed() || M5.BtnB.wasPressed() || M5.BtnC.wasPressed())
  {
    printer.continuePrint();
  }
}