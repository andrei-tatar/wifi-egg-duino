#include <Arduino.h>
#include <M5Stack.h>
#include <WiFi.h>

#include "web.h"
#include "printer.h"
#include "Free_Fonts.h"

Printer printer;
Web web(SD, printer);

void setup()
{
  WiFi.begin();
  M5.begin();
  M5.Lcd.setFreeFont(FSS12);
  M5.Lcd.println();
  printer.begin();
  web.begin();

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

  if (M5.BtnA.wasPressed() || M5.BtnB.wasPressed() || M5.BtnC.wasPressed())
  {
    printer.continuePrint();
  }
}