/// <reference path="../node_modules/pxt-core/typings/bluebird/bluebird.d.ts"/>
/// <reference path="../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../libs/microbit/dal.d.ts"/>

namespace pxsim {
    export enum BoardTypes {
        microbit,
        nrf51dk
    }
    //TODO(DZ): allow board selection
    export const boardType = BoardTypes.nrf51dk; 

    pxsim.initCurrentRuntime = () => {
        U.assert(!runtime.board);
        if (boardType == BoardTypes.microbit) {
            runtime.board = new MicrobitBoard();
        } else if (boardType == BoardTypes.nrf51dk) {
            runtime.board = new Nrf51dkBoard();
        }
    }

    export function board() {
        return runtime.board as DalBoard;
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

namespace pxsim.boardsvg {
    export interface IPointerEvents {
        up: string,
        down: string,
        move: string,
        leave: string
    }

    export const pointerEvents: IPointerEvents = !!(window as any).PointerEvent ? {
        up: "pointerup",
        down: "pointerdown",
        move: "pointermove",
        leave: "pointerleave"
    } : {
        up: "mouseup",
        down: "mousedown",
        move: "mousemove",
        leave: "mouseleave"
    };
}

namespace pxsim {
    export interface RuntimeOptions {
        theme: string;
    }

    export class EventBus {
        private queues: Map<EventQueue<number>> = {};

        constructor(private runtime: Runtime) { }

        listen(id: number, evid: number, handler: RefAction) {
            let k = id + ":" + evid;
            let queue = this.queues[k];
            if (!queue) queue = this.queues[k] = new EventQueue<number>(this.runtime);
            queue.handler = handler;
        }

        queue(id: number, evid: number, value: number = 0) {
            let k = id + ":" + evid;
            let queue = this.queues[k];
            if (queue) queue.push(value);
        }
    }

    export class DalBoard extends BaseBoard {
        id: string;

        // the bus
        bus: EventBus;
        
        // components
        //TODO(DZ): allow different component selections
        displayCmp: LedMatrixCmp;
        edgeConnectorState: EdgeConnectorCmp;
        serialCmp: SerialCmp;
        accelerometerCmp: AccelerometerCmp;
        compassCmp: CompassCmp;
        thermometerCmp: ThermometerCmp;
        lightSensorCmp: LightSensorCmp;
        buttonPairState: ButtonPairCmp;
        radioCmp: RadioCmp;

        constructor() {
            super()
            this.id = "b" + Math_.random(2147483647);
            this.bus = new EventBus(runtime);
            
            // components
            this.displayCmp = new LedMatrixCmp(runtime);
            this.buttonPairState = new ButtonPairCmp();
            this.edgeConnectorState = new EdgeConnectorCmp();
            this.radioCmp = new RadioCmp(runtime);
            this.accelerometerCmp = new AccelerometerCmp(runtime);
            this.serialCmp = new SerialCmp();
            this.thermometerCmp = new ThermometerCmp();
            this.lightSensorCmp = new LightSensorCmp();
            this.compassCmp = new CompassCmp();
        }

        receiveMessage(msg: SimulatorMessage) {
            if (!runtime || runtime.dead) return;

            switch (msg.type || "") {
                case "eventbus":
                    let ev = <SimulatorEventBusMessage>msg;
                    this.bus.queue(ev.id, ev.eventid, ev.value);
                    break;
                case "serial":
                    let data = (<SimulatorSerialMessage>msg).data || "";
                    this.serialCmp.recieveData(data);
                    break;
                case "radiopacket":
                    let packet = <SimulatorRadioPacketMessage>msg;
                    this.radioCmp.recievePacket(packet);
                    break;
            }
        }

        kill() {
            super.kill();
            AudioContextManager.stop();
        }
    }
}