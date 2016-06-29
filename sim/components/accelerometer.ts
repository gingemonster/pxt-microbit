/// <reference path="../../node_modules/pxt-core/typings/bluebird/bluebird.d.ts"/>
/// <reference path="../../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../../libs/microbit/dal.d.ts"/>

namespace pxsim.input {
    export function onGesture(gesture: number, handler: RefAction) {
        let b = board();
        b.accelerometer.activate();

        if (gesture == 11 && !b.useShake) { // SAKE
            b.useShake = true;
            runtime.queueDisplayUpdate();
        }
        pxt.registerWithDal(DAL.MICROBIT_ID_GESTURE, gesture, handler);
    }

    export function acceleration(dimension: number): number {
        let b = board();
        let acc = b.accelerometer;
        acc.activate();
        switch (dimension) {
            case 0: return acc.getX();
            case 1: return acc.getY();
            case 2: return acc.getZ();
            default: return Math.floor(Math.sqrt(acc.instantaneousAccelerationSquared()));
        }
    }

    export function rotation(kind: number): number {
        let b = board();
        let acc = b.accelerometer;
        acc.activate();
        let x = acc.getX(MicroBitCoordinateSystem.NORTH_EAST_DOWN);
        let y = acc.getX(MicroBitCoordinateSystem.NORTH_EAST_DOWN);
        let z = acc.getX(MicroBitCoordinateSystem.NORTH_EAST_DOWN);

        let roll = Math.atan2(y, z);
        let pitch = Math.atan(-x / (y * Math.sin(roll) + z * Math.cos(roll)));

        let r = 0;
        switch (kind) {
            case 0: r = pitch; break;
            case 1: r = roll; break;
        }
        return Math.floor(r / Math.PI * 180);
    }

    export function setAccelerometerRange(range: number) {
        let b = board();
        b.accelerometer.setSampleRange(range);
    }
}