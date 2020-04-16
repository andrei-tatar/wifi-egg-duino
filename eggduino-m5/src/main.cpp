#include <Arduino.h>
#include <M5Stack.h>
#include <WiFi.h>
#include <DNSServer.h>

#include "web.h"
#include "printer.h"
#include "Free_Fonts.h"

Printer printer;
Web web(SD, printer);
DNSServer dnsServer;

void startAp()
{
  char ssid[14];
  snprintf(ssid, sizeof(ssid), "EggBot-%04X", (uint16_t)(ESP.getEfuseMac() >> 32));
  WiFi.softAP(ssid);
}

void setup()
{
  if (WiFi.begin() != WL_CONNECTED)
  {
    startAp();
  }
  dnsServer.start(53, "*", IPAddress(192, 168, 4, 1));

  M5.begin();
  M5.Lcd.setFreeFont(FSS12);
  M5.Lcd.println();
  printer.begin();
  web.begin();
}

void loop()
{
  dnsServer.processNextRequest();

  uint32_t lastCheck = 0;
  if (millis() > lastCheck)
  {
    lastCheck = millis() + 10000;

    auto status = WiFi.status();
    if (status == WL_CONNECTED)
    {
      WiFi.enableAP(false);
    }
    else if (status == WL_NO_SSID_AVAIL)
    {
      startAp();
      WiFi.enableSTA(false);
    }
    else if (status == WL_DISCONNECTED)
    {
      startAp();
    }
  }

  M5.update();

  if (M5.BtnA.wasPressed() || M5.BtnB.wasPressed() || M5.BtnC.wasPressed())
  {
    printer.continuePrint();
  }
}