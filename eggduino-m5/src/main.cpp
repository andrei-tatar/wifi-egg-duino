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
  if (!WiFi.begin())
  {
    char ssid[14];
    snprintf(ssid, sizeof(ssid), "EggBot-%04X", (uint16_t)(ESP.getEfuseMac() >> 32));
    WiFi.softAP(ssid, NULL);
  }

  M5.begin();
  M5.Lcd.setFreeFont(FSS12);
  M5.Lcd.println();
  printer.begin();
  web.begin();
}

void loop()
{
  uint32_t lastCheck = 0;
  if (millis() > lastCheck)
  {
    lastCheck = millis() + 5000;

    if (WiFi.status() == WL_CONNECTED)
    {
      if (WiFi.getMode() & WIFI_MODE_AP)
      {
        WiFi.enableAP(false);
      }
    }
    else
    {
      if ((WiFi.getMode() & WIFI_MODE_AP) == 0)
      {
        WiFi.enableAP(true);
      }
    }
  }

  M5.update();

  if (M5.BtnA.wasPressed() || M5.BtnB.wasPressed() || M5.BtnC.wasPressed())
  {
    printer.continuePrint();
  }
}