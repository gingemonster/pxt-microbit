/// <reference path="../node_modules/pxt-core/typings/bluebird/bluebird.d.ts"/>
/// <reference path="../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../libs/microbit/dal.d.ts"/>

namespace pxsim {
    pxsim.initCurrentRuntime = () => {
        U.assert(!runtime.board);
        runtime.board = new Board();
    }

    export function board() {
        return runtime.board as Board;
    }

    export interface AnimationOptions {
        interval: number;
        // false means last frame
        frame: () => boolean;
        whenDone?: (cancelled: boolean) => void;
    }

    export class AnimationQueue {
        private queue: AnimationOptions[] = [];
        private process: () => void;

        constructor(private runtime: Runtime) {
            this.process = () => {
                let top = this.queue[0]
                if (!top) return
                if (this.runtime.dead) return
                runtime = this.runtime
                let res = top.frame()
                runtime.queueDisplayUpdate()
                runtime.maybeUpdateDisplay()
                if (res === false) {
                    this.queue.shift();
                    // if there is already something in the queue, start processing
                    if (this.queue[0])
                        setTimeout(this.process, this.queue[0].interval)
                    // this may push additional stuff 
                    top.whenDone(false);
                } else {
                    setTimeout(this.process, top.interval)
                }
            }
        }

        public cancelAll() {
            let q = this.queue
            this.queue = []
            for (let a of q) {
                a.whenDone(true)
            }
        }

        public cancelCurrent() {
            let top = this.queue[0]
            if (top) {
                this.queue.shift();
                top.whenDone(true);
            }
        }

        public enqueue(anim: AnimationOptions) {
            if (!anim.whenDone) anim.whenDone = () => { };
            this.queue.push(anim)
            // we start processing when the queue goes from 0 to 1
            if (this.queue.length == 1)
                this.process()
        }

        public executeAsync(anim: AnimationOptions) {
            U.assert(!anim.whenDone)
            return new Promise<boolean>((resolve, reject) => {
                anim.whenDone = resolve
                this.enqueue(anim)
            })
        }
    }

    /**
      * Error codes used in the micro:bit runtime.
      */
    export enum PanicCode {
        // PANIC Codes. These are not return codes, but are terminal conditions.
        // These induce a panic operation, where all code stops executing, and a panic state is
        // entered where the panic code is diplayed.

        // Out out memory error. Heap storage was requested, but is not available.
        MICROBIT_OOM = 20,

        // Corruption detected in the micro:bit heap space
        MICROBIT_HEAP_ERROR = 30,

        // Dereference of a NULL pointer through the ManagedType class,
        MICROBIT_NULL_DEREFERENCE = 40,
    };

    export function panic(code: number) {
        console.log("PANIC:", code)
        led.setBrightness(255);
        let img = board().image;
        img.clear();
        img.set(0, 4, 255);
        img.set(1, 3, 255);
        img.set(2, 3, 255);
        img.set(3, 3, 255);
        img.set(4, 4, 255);
        img.set(0, 0, 255);
        img.set(1, 0, 255);
        img.set(0, 1, 255);
        img.set(1, 1, 255);
        img.set(3, 0, 255);
        img.set(4, 0, 255);
        img.set(3, 1, 255);
        img.set(4, 1, 255);
        runtime.updateDisplay();

        throw new Error("PANIC " + code)
    }

    export namespace AudioContextManager {
        let _context: any; // AudioContext
        let _vco: any; // OscillatorNode;
        let _vca: any; // GainNode;

        function context(): any {
            if (!_context) _context = freshContext();
            return _context;
        }

        function freshContext(): any {
            (<any>window).AudioContext = (<any>window).AudioContext || (<any>window).webkitAudioContext;
            if ((<any>window).AudioContext) {
                try {
                    // this call my crash.
                    // SyntaxError: audio resources unavailable for AudioContext construction
                    return new (<any>window).AudioContext();
                } catch (e) { }
            }
            return undefined;
        }

        export function stop() {
            if (_vca) _vca.gain.value = 0;
        }

        export function tone(frequency: number, gain: number) {
            if (frequency <= 0) return;
            let ctx = context();
            if (!ctx) return;

            gain = Math.max(0, Math.min(1, gain));
            if (!_vco) {
                try {
                    _vco = ctx.createOscillator();
                    _vca = ctx.createGain();
                    _vco.connect(_vca);
                    _vca.connect(ctx.destination);
                    _vca.gain.value = gain;
                    _vco.start(0);
                } catch (e) {
                    _vco = undefined;
                    _vca = undefined;
                    return;
                }
            }

            _vco.frequency.value = frequency;
            _vca.gain.value = gain;
        }
    }


}

namespace pxsim.basic {
    export var pause = thread.pause;
    export var forever = thread.forever;

    export function showNumber(x: number, interval: number) {
        if (interval < 0) return;

        let leds = createImageFromString(x.toString());
        if (x < 0 || x >= 10) ImageMethods.scrollImage(leds, 1, interval);
        else showLeds(leds, interval * 5);
    }

    export function showString(s: string, interval: number) {
        if (interval < 0) return;
        if (s.length == 0) {
            clearScreen();
            pause(interval * 5);
        } else {
            if (s.length == 1) showLeds(createImageFromString(s), interval * 5)
            else ImageMethods.scrollImage(createImageFromString(s + " "), 1, interval);
        }
    }

    export function showLeds(leds: Image, delay: number): void {
        showAnimation(leds, delay);
    }

    export function clearScreen() {
        board().image.clear();
        runtime.queueDisplayUpdate()
    }

    export function showAnimation(leds: Image, interval: number): void {
        ImageMethods.scrollImage(leds, 5, interval);
    }

    export function plotLeds(leds: Image): void {
        ImageMethods.plotImage(leds, 0);
    }
}

namespace pxsim.control {
    export var inBackground = thread.runInBackground;

    export function reset() {
        U.userError("reset not implemented in simulator yet")
    }

    export function deviceName(): string {
        let b = board();
        return b && b.id
            ? b.id.slice(0, 4)
            : "abcd";
    }

    export function deviceSerialNumber(): number {
        let b = board();
        return parseInt(b && b.id
            ? b.id.slice(1)
            : "42");
    }

    export function onEvent(id: number, evid: number, handler: RefAction) {
        pxt.registerWithDal(id, evid, handler)
    }

    export function raiseEvent(id: number, evid: number, mode: number) {
        // TODO mode?
        board().bus.queue(id, evid)
    }
}

namespace pxsim.pxt {
    export function registerWithDal(id: number, evid: number, handler: RefAction) {
        board().bus.listen(id, evid, handler);
    }
}

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

    export function compassHeading(): number {
        let b = board();
        if (!b.usesHeading) {
            b.usesHeading = true;
            runtime.queueDisplayUpdate();
        }
        return b.heading;
    }

    export function temperature(): number {
        let b = board();
        if (!b.usesTemperature) {
            b.usesTemperature = true;
            runtime.queueDisplayUpdate();
        }
        return b.temperature;
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

    export function lightLevel(): number {
        let b = board();
        if (!b.usesLightLevel) {
            b.usesLightLevel = true;
            runtime.queueDisplayUpdate();
        }
        return b.lightLevel;
    }

    export function magneticForce(): number {
        // TODO
        return 0;
    }

    export function runningTime(): number {
        return runtime.runningTime();
    }

    export function calibrate() {
    }
}

namespace pxsim.led {
    export function plot(x: number, y: number) {
        board().image.set(x, y, 255);
        runtime.queueDisplayUpdate()
    }

    export function unplot(x: number, y: number) {
        board().image.set(x, y, 0);
        runtime.queueDisplayUpdate()
    }

    export function point(x: number, y: number): boolean {
        return !!board().image.get(x, y);
    }

    export function brightness(): number {
        return board().brigthness;
    }

    export function setBrightness(value: number): void {
        board().brigthness = value;
        runtime.queueDisplayUpdate()
    }

    export function stopAnimation(): void {
        board().animationQ.cancelAll();
    }

    export function setDisplayMode(mode: DisplayMode): void {
        board().displayMode = mode;
        runtime.queueDisplayUpdate()
    }

    export function screenshot(): Image {
        let img = createImage(5)
        board().image.copyTo(0, 5, img, 0);
        return img;
    }
}

namespace pxsim.serial {
    export function writeString(s: string) {
        board().writeSerial(s);
    }

    export function readString(): string {
        return board().readSerial();
    }

    export function readLine(): string {
        return board().readSerial();
    }

    export function onDataReceived(delimiters: string, handler: RefAction) {
        let b = board();
        b.bus.listen(DAL.MICROBIT_ID_SERIAL, DAL.MICROBIT_SERIAL_EVT_DELIM_MATCH, handler);
    }

    export function redirect(tx: number, rx: number, rate: number) {
        // TODO?
    }
}


namespace pxsim.radio {
    export function broadcastMessage(msg: number): void {
        board().radio.broadcast(msg);
    }

    export function onBroadcastMessageReceived(msg: number, handler: RefAction): void {
        pxt.registerWithDal(DAL.MES_BROADCAST_GENERAL_ID, msg, handler);
    }

    export function setGroup(id: number): void {
        board().radio.setGroup(id);
    }

    export function setTransmitPower(power: number): void {
        board().radio.setTransmitPower(power);
    }

    export function setTransmitSerialNumber(transmit: boolean): void {
        board().radio.setTransmitSerialNumber(transmit);
    }

    export function sendNumber(value: number): void {
        board().radio.datagram.send([value]);
    }

    export function sendString(msg: string): void {
        board().radio.datagram.send(msg);
    }

    export function writeValueToSerial(): void {
        let b = board();
        let v = b.radio.datagram.recv().data[0];
        b.writeSerial(`{v:${v}}`);
    }

    export function sendValue(name: string, value: number) {
        board().radio.datagram.send([value]);
    }

    export function receiveNumber(): number {
        let buffer = board().radio.datagram.recv().data;
        if (buffer instanceof Array) return buffer[0];

        return 0;
    }

    export function receiveString(): string {
        let buffer = board().radio.datagram.recv().data;
        if (typeof buffer === "string") return <string>buffer;
        return "";
    }

    export function receivedNumberAt(index: number): number {
        let buffer = board().radio.datagram.recv().data;
        if (buffer instanceof Array) return buffer[index] || 0;

        return 0;
    }

    export function receivedSignalStrength(): number {
        return board().radio.datagram.lastReceived.rssi;
    }

    export function onDataReceived(handler: RefAction): void {
        pxt.registerWithDal(DAL.MICROBIT_ID_RADIO, DAL.MICROBIT_RADIO_EVT_DATAGRAM, handler);
    }
}

namespace pxsim.pins {
    export function onPulsed(name: number, pulse: number, body: RefAction) {
    }

    export function pulseDuration(): number {
        return 0;
    }

    export function createBuffer(sz: number) {
        return pxsim.BufferMethods.createBuffer(sz)
    }

    export function i2cReadBuffer(address: number, size: number, repeat?: boolean): RefBuffer {
        // fake reading zeros
        return createBuffer(size)
    }

    export function i2cWriteBuffer(address: number, buf: RefBuffer, repeat?: boolean): void {
        // fake - noop
    }
}

namespace pxsim.bluetooth {
    export function startIOPinService(): void {
        // TODO
    }
    export function startLEDService(): void {
        // TODO
    }
    export function startTemperatureService(): void {
        // TODO
    }
    export function startMagnetometerService(): void {
        // TODO
    }
    export function startAccelerometerService(): void {
        // TODO
    }
    export function startButtonService(): void {
        // TODO
    }
}

namespace pxsim.images {
    export function createImage(img: Image) { return img }
    export function createBigImage(img: Image) { return img }
}

namespace pxsim.ImageMethods {
    export function showImage(leds: Image, offset: number) {
        if (!leds) panic(PanicCode.MICROBIT_NULL_DEREFERENCE);

        leds.copyTo(offset, 5, board().image, 0)
        runtime.queueDisplayUpdate()
    }

    export function plotImage(leds: Image, offset: number): void {
        if (!leds) panic(PanicCode.MICROBIT_NULL_DEREFERENCE);

        leds.copyTo(offset, 5, board().image, 0)
        runtime.queueDisplayUpdate()
    }

    export function height(leds: Image): number {
        if (!leds) panic(PanicCode.MICROBIT_NULL_DEREFERENCE);
        return Image.height;
    }

    export function width(leds: Image): number {
        if (!leds) panic(PanicCode.MICROBIT_NULL_DEREFERENCE);
        return leds.width;
    }

    export function plotFrame(leds: Image, frame: number) {
        ImageMethods.plotImage(leds, frame * Image.height);
    }

    export function showFrame(leds: Image, frame: number) {
        ImageMethods.showImage(leds, frame * Image.height);
    }

    export function pixel(leds: Image, x: number, y: number): number {
        if (!leds) panic(PanicCode.MICROBIT_NULL_DEREFERENCE);
        return leds.get(x, y);
    }

    export function setPixel(leds: Image, x: number, y: number, v: number) {
        if (!leds) panic(PanicCode.MICROBIT_NULL_DEREFERENCE);
        leds.set(x, y, v);
    }

    export function clear(leds: Image) {
        if (!leds) panic(PanicCode.MICROBIT_NULL_DEREFERENCE);

        leds.clear();
    }

    export function setPixelBrightness(i: Image, x: number, y: number, b: number) {
        if (!i) panic(PanicCode.MICROBIT_NULL_DEREFERENCE);

        i.set(x, y, b);
    }

    export function pixelBrightness(i: Image, x: number, y: number): number {
        if (!i) panic(PanicCode.MICROBIT_NULL_DEREFERENCE);

        return i.get(x, y);
    }

    export function scrollImage(leds: Image, stride: number, interval: number): void {
        if (!leds) panic(PanicCode.MICROBIT_NULL_DEREFERENCE);
        if (stride == 0) stride = 1;

        let cb = getResume();
        let off = stride > 0 ? 0 : leds.width - 1;
        let display = board().image;

        board().animationQ.enqueue({
            interval: interval,
            frame: () => {
                if (off >= leds.width || off < 0) return false;
                stride > 0 ? display.shiftLeft(stride) : display.shiftRight(-stride);
                let c = Math.min(stride, leds.width - off);
                leds.copyTo(off, c, display, 5 - stride)
                off += stride;
                return true;
            },
            whenDone: cb
        })
    }
}
