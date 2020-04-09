#include <Arduino.h>
#include "esp32-hal-ledc.h"
#include "motion.h"

void moveTaskHandler(void *parameter)
{
    ((Motion *)parameter)->moveTask();
    vTaskDelete(NULL);
}

Motion::Motion()
    : mRotation(AccelStepper::DRIVER, PIN_ROT_STEP, PIN_ROT_DIR),
      mPen(AccelStepper::DRIVER, PIN_PEN_STEP, PIN_PEN_DIR)
{
    mRotation.setEnablePin(PIN_ROT_RES);
    mPen.setEnablePin(PIN_PEN_RES);
    mRotation.setAcceleration(.1);
    mPen.setAcceleration(.1);

    multiStepper.addStepper(mRotation);
    multiStepper.addStepper(mPen);
}

void Motion::begin()
{
    disableMotors();
    ledcSetup(SERVO_CHA, 50, 16);
    ledcAttachPin(PIN_SERVO, SERVO_CHA);

    preferences.begin("motion");
    getParameters(parameters);
    applyParameters();

    penUp();
}

void Motion::startTimer()
{
    _isMoving = true;
    xTaskCreate(moveTaskHandler, "MOVE", 10000, this, 10, NULL);
}

void Motion::moveTask()
{
    while (multiStepper.run())
    {
    }
    _isMoving = false;
}

bool Motion::isMoving()
{
    return _isMoving;
}

void Motion::travelHome()
{
    long pos[2] = {0, 0};
    multiStepper.moveTo(pos);
    startTimer();
}

long Motion::getPenPosition()
{
    return mPen.currentPosition();
}

void Motion::setPenPosition(long penPos)
{
    long pos[2] = {mRotation.currentPosition(), penPos};
    multiStepper.moveTo(pos);
    startTimer();
}

void Motion::travelAbsolute(long x, long y)
{
    long pos[2] = {x, y};

    multiStepper.moveTo(pos);
    startTimer();
}

void Motion::enableMotors()
{
    mRotation.enableOutputs();
    mPen.enableOutputs();
}

void Motion::disableMotors()
{
    mRotation.disableOutputs();
    mPen.disableOutputs();
}

void Motion::penUp()
{
    _isPenUp = true;
    ledcWrite(SERVO_CHA, penUpValue);
    delay(parameters.penMoveDelay);
    mRotation.setMaxSpeed(parameters.travelSpeed);
    mPen.setMaxSpeed(parameters.travelSpeed);
}

void Motion::penDown()
{
    _isPenUp = false;
    ledcWrite(SERVO_CHA, penDownValue);
    delay(parameters.penMoveDelay);
    mRotation.setMaxSpeed(parameters.drawingSpeed);
    mPen.setMaxSpeed(parameters.drawingSpeed);
}

void Motion::getParameters(MotionParameters &params)
{
    auto size = sizeof(MotionParameters);
    if (preferences.getBytes("*", &params, size) != size)
    {
        params.penDownPercent = 70;
        params.penUpPercent = 40;
        params.drawingSpeed = 500;
        params.travelSpeed = 2000;
        params.penMoveDelay = 150;
        params.stepsPerRotation = 6400;
        params.reversePen = false;
        params.reverseRotation = false;
    }
}

void Motion::setParameters(const MotionParameters &params)
{
    parameters = params;
    preferences.putBytes("*", &parameters, sizeof(MotionParameters));
    applyParameters();
}

void Motion::applyParameters()
{
    penUpValue = SERVO_MIN + (SERVO_MAX - SERVO_MIN) * parameters.penUpPercent / 100;
    penDownValue = SERVO_MIN + (SERVO_MAX - SERVO_MIN) * parameters.penDownPercent / 100;

    if (_isPenUp)
    {
        penUp();
        mRotation.setMaxSpeed(parameters.travelSpeed);
        mPen.setMaxSpeed(parameters.travelSpeed);
    }
    else
    {
        penDown();
        mRotation.setMaxSpeed(parameters.drawingSpeed);
        mPen.setMaxSpeed(parameters.drawingSpeed);
    }

    mRotation.setPinsInverted(parameters.reverseRotation);
    mPen.setPinsInverted(parameters.reversePen);
}
