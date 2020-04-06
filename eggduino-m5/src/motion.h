#ifndef MOTION_H
#define MOTION_H

#include <stdint.h>
#include <Preferences.h>
#include <AccelStepper.h>
#include <MultiStepper.h>

#define PIN_ROT_DIR 2
#define PIN_ROT_STEP 17
#define PIN_ROT_RES 16

#define PIN_PEN_DIR 5
#define PIN_PEN_STEP 26
#define PIN_PEN_RES 22

#define PIN_SERVO 21
#define SERVO_CHA 2
#define SERVO_MIN (65536 / 20)
#define SERVO_MAX (2 * SERVO_MIN)

struct MotionParameters
{
    uint8_t penUpPercent, penDownPercent;
    uint16_t drawingSpeed, travelSpeed;
    uint16_t penMoveDelay;
    uint16_t stepsPerRotation;
    bool reverseRotation, reversePen;
};

class Motion
{
public:
    Motion();
    void begin();
    bool update();

    void travelHome();
    void travelAbsolute(long x, long y);
    void enableMotors();
    void disableMotors();
    void penUp();
    void penDown();
    void getParameters(MotionParameters &params);
    void setParameters(const MotionParameters &params);
    bool isPenUp() { return _isPenUp; }
    
    long getPenPosition();
    void setPenPosition(long pos);

private:
    void applyParameters();

    AccelStepper mRotation, mPen;
    MultiStepper multiStepper;

    int32_t posX, posY;
    uint16_t penUpValue, penDownValue;
    bool _isPenUp;
    Preferences preferences;
    MotionParameters parameters;
};

#endif