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
        let img = board().displayCmp.image;
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
    export function compassHeading(): number {
        let b = board();
        if (!b.usesHeading) {
            b.usesHeading = true;
            runtime.queueDisplayUpdate();
        }
        return b.heading;
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