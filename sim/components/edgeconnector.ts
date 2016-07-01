/// <reference path="../../node_modules/pxt-core/typings/bluebird/bluebird.d.ts"/>
/// <reference path="../../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../../libs/microbit/dal.d.ts"/>

namespace pxsim.input {
    export function onPinPressed(pinId: number, handler: RefAction) {
        let pin = getPin(pinId);
        if (!pin) return;
        pin.isTouched();
        input.onButtonPressed(pin.id, handler);
    }

    export function pinIsPressed(pinId: number): boolean {
        let pin = getPin(pinId);
        if (!pin) return false;
        return pin.isTouched();
    }
}

namespace pxsim.boardsvg {
    export interface IEdgeConnectorTheme {
        pin?: string;
        pinTouched?: string;
        pinActive?: string;
    }

    export var defaultEdgeConnectorTheme: IEdgeConnectorTheme = {
        pin: "#D4AF37",
        pinTouched: "#FFA500",
        pinActive: "#FF5500",
    };

    export class EdgeConnectorSvg {
        private pins: SVGElement[];
        private pinGradients: SVGLinearGradientElement[];
        private pinTexts: SVGTextElement[];

        public style = `
.sim-pin:hover {
    stroke:#D4AF37;
    stroke-width:2px;
}

.sim-pin-touch.touched:hover {
    stroke:darkorange;
}

.sim-text-pin {
  font-family:"Lucida Console", Monaco, monospace;
  font-size:20px;
  fill:#fff;
  pointer-events: none;
}`;

        public updateTheme(theme: IEdgeConnectorTheme) {
            this.pinGradients.forEach(lg => svg.setGradientColors(lg, theme.pin, theme.pinActive));
        }

        public updateState(g: SVGElement, state: EdgeConnectorCmp, edgeConnectorTheme: IEdgeConnectorTheme) {
            if (!state) return;

            state.pins.forEach((pin, i) => this.updatePin(pin, i));
        }

        private updatePin(pin: Pin, index: number) {
            if (!pin) return;
            let text = this.pinTexts[index];
            let v = "";
            if (pin.mode & PinFlags.Analog) {
                v = Math.floor(100 - (pin.value || 0) / 1023 * 100) + "%";
                if (text) text.textContent = (pin.period ? "~" : "") + (pin.value || 0) + "";
            }
            else if (pin.mode & PinFlags.Digital) {
                v = pin.value > 0 ? "0%" : "100%";
                if (text) text.textContent = pin.value > 0 ? "1" : "0";
            }
            else if (pin.mode & PinFlags.Touch) {
                v = pin.touched ? "0%" : "100%";
                if (text) text.textContent = "";
            } else {
                v = "100%";
                if (text) text.textContent = "";
            }
            if (v) svg.setGradientValue(this.pinGradients[index], v);
        }

        public buildDom(g: SVGElement, defs: SVGDefsElement) {
            // https://www.microbit.co.uk/device/pins
            // P0, P1, P2
            this.pins = [
                "M16.5,341.2c0,0.4-0.1,0.9-0.1,1.3v60.7c4.1,1.7,8.6,2.7,12.9,2.7h34.4v-64.7h0.3c0,0,0-0.1,0-0.1c0-13-10.6-23.6-23.7-23.6C27.2,317.6,16.5,328.1,16.5,341.2z M21.2,341.6c0-10.7,8.7-19.3,19.3-19.3c10.7,0,19.3,8.7,19.3,19.3c0,10.7-8.6,19.3-19.3,19.3C29.9,360.9,21.2,352.2,21.2,341.6z",
                "M139.1,317.3c-12.8,0-22.1,10.3-23.1,23.1V406h46.2v-65.6C162.2,327.7,151.9,317.3,139.1,317.3zM139.3,360.1c-10.7,0-19.3-8.6-19.3-19.3c0-10.7,8.6-19.3,19.3-19.3c10.7,0,19.3,8.7,19.3,19.3C158.6,351.5,150,360.1,139.3,360.1z",
                "M249,317.3c-12.8,0-22.1,10.3-23.1,23.1V406h46.2v-65.6C272.1,327.7,261.8,317.3,249,317.3z M249.4,360.1c-10.7,0-19.3-8.6-19.3-19.3c0-10.7,8.6-19.3,19.3-19.3c10.7,0,19.3,8.7,19.3,19.3C268.7,351.5,260.1,360.1,249.4,360.1z"
            ].map((p, pi) => svg.path(g, "sim-pin sim-pin-touch", p, `P${pi}, ANALOG IN`));

            // P3
            this.pins.push(svg.path(g, "sim-pin", "M0,357.7v19.2c0,10.8,6.2,20.2,14.4,25.2v-44.4H0z", "P3, ANALOG IN, LED Col 1"));

            // other pins
            [66.7, 79.1, 91.4, 103.7, 164.3, 176.6, 188.9, 201.3, 213.6, 275.2, 287.5, 299.8, 312.1, 324.5, 385.1, 397.4, 409.7, 422].forEach(x => {
                this.pins.push(svg.child(g, "rect", { x: x, y: 356.7, width: 10, height: 50, class: "sim-pin" }));
            })
            svg.title(this.pins[4], "P4, ANALOG IN, LED Col 2")
            svg.title(this.pins[5], "P5, BUTTON A")
            svg.title(this.pins[6], "P6, LED Col 9")
            svg.title(this.pins[7], "P7, LED Col 8")
            svg.title(this.pins[8], "P8")
            svg.title(this.pins[9], "P9, LED Col 7")
            svg.title(this.pins[10], "P10, ANALOG IN, LED Col 3")
            svg.title(this.pins[11], "P11, BUTTON B")
            svg.title(this.pins[12], "P12, RESERVED ACCESSIBILITY")
            svg.title(this.pins[13], "P13, SPI - SCK")
            svg.title(this.pins[14], "P14, SPI - MISO")
            svg.title(this.pins[15], "P15, SPI - MOSI")
            svg.title(this.pins[16], "P16, SPI - Chip Select")
            svg.title(this.pins[17], "P17, +3v3")
            svg.title(this.pins[18], "P18, +3v3")
            svg.title(this.pins[19], "P19, I2C - SCL")
            svg.title(this.pins[20], "P20, I2C - SDA")
            svg.title(this.pins[21], "GND")

            this.pins.push(svg.path(g, "sim-pin", "M483.6,402c8.2-5,14.4-14.4,14.4-25.1v-19.2h-14.4V402z", "GND"));

            this.pins.push(svg.path(g, "sim-pin", "M359.9,317.3c-12.8,0-22.1,10.3-23.1,23.1V406H383v-65.6C383,327.7,372.7,317.3,359.9,317.3z M360,360.1c-10.7,0-19.3-8.6-19.3-19.3c0-10.7,8.6-19.3,19.3-19.3c10.7,0,19.3,8.7,19.3,19.3C379.3,351.5,370.7,360.1,360,360.1z", "+3v3"));
            this.pins.push(svg.path(g, "sim-pin", "M458,317.6c-13,0-23.6,10.6-23.6,23.6c0,0,0,0.1,0,0.1h0V406H469c4.3,0,8.4-1,12.6-2.7v-60.7c0-0.4,0-0.9,0-1.3C481.6,328.1,471,317.6,458,317.6z M457.8,360.9c-10.7,0-19.3-8.6-19.3-19.3c0-10.7,8.6-19.3,19.3-19.3c10.7,0,19.3,8.7,19.3,19.3C477.1,352.2,468.4,360.9,457.8,360.9z", "GND"));


            this.pinGradients = this.pins.map((pin, i) => {
                let gid = "gradient-pin-" + i
                let lg = svg.linearGradient(defs, gid)
                pin.setAttribute("fill", `url(#${gid})`);
                return lg;
            })

            this.pinTexts = [67, 165, 275].map(x => <SVGTextElement>svg.child(g, "text", { class: "sim-text-pin", x: x, y: 345 }));
        }
        
        public attachEvents(pointerEvents: IPointerEvents, bus: EventBus, state: EdgeConnectorCmp, element: SVGSVGElement) {
            this.pins.forEach((pin, index) => {
                if (!state.pins[index]) return;
                let pt = element.createSVGPoint();
                svg.buttonEvents(pin,
                    // move
                    ev => {
                        let pin = state.pins[index];
                        let svgpin = this.pins[index];
                        if (pin.mode & PinFlags.Input) {
                            let cursor = svg.cursorPoint(pt, element, ev);
                            let v = (400 - cursor.y) / 40 * 1023
                            pin.value = Math.max(0, Math.min(1023, Math.floor(v)));
                        }
                        this.updatePin(pin, index);
                    },
                    // start
                    ev => {
                        let pin = state.pins[index];
                        let svgpin = this.pins[index];
                        svg.addClass(svgpin, "touched");
                        if (pin.mode & PinFlags.Input) {
                            let cursor = svg.cursorPoint(pt, element, ev);
                            let v = (400 - cursor.y) / 40 * 1023
                            pin.value = Math.max(0, Math.min(1023, Math.floor(v)));
                        }
                        this.updatePin(pin, index);
                    },
                    // stop
                    (ev: MouseEvent) => {
                        let pin = state.pins[index];
                        let svgpin = this.pins[index];
                        svg.removeClass(svgpin, "touched");
                        this.updatePin(pin, index);
                        return false;
                    });
            })
            this.pins.slice(0, 3).forEach((btn, index) => {
                btn.addEventListener(pointerEvents.down, ev => {
                    state.pins[index].touched = true;
                    this.updatePin(state.pins[index], index);
                })
                btn.addEventListener(pointerEvents.leave, ev => {
                    state.pins[index].touched = false;
                    this.updatePin(state.pins[index], index);
                })
                btn.addEventListener(pointerEvents.up, ev => {
                    state.pins[index].touched = false;
                    this.updatePin(state.pins[index], index);
                    bus.queue(state.pins[index].id, DAL.MICROBIT_BUTTON_EVT_CLICK);
                })
            })
        }
    }
}

namespace pxsim {
    export function getPin(id: number) {
        return board().edgeConnectorState.getPin(id);
    }

    export enum PinFlags {
        Unused = 0,
        Digital = 0x0001,
        Analog = 0x0002,
        Input = 0x0004,
        Output = 0x0008,
        Touch = 0x0010
    }

    export class Pin {
        constructor(public id: number) { }
        touched = false;
        value = 0;
        period = 0;
        mode = PinFlags.Unused;
        pitch = false;
        pull = 0; // PullDown

        isTouched(): boolean {
            this.mode = PinFlags.Touch;
            return this.touched;
        }
    }

    export class EdgeConnectorCmp {
        pins: Pin[];

        constructor() {
            this.pins = [
                new Pin(DAL.MICROBIT_ID_IO_P0),
                new Pin(DAL.MICROBIT_ID_IO_P1),
                new Pin(DAL.MICROBIT_ID_IO_P2),
                new Pin(DAL.MICROBIT_ID_IO_P3),
                new Pin(DAL.MICROBIT_ID_IO_P4),
                new Pin(DAL.MICROBIT_ID_IO_P5),
                new Pin(DAL.MICROBIT_ID_IO_P6),
                new Pin(DAL.MICROBIT_ID_IO_P7),
                new Pin(DAL.MICROBIT_ID_IO_P8),
                new Pin(DAL.MICROBIT_ID_IO_P9),
                new Pin(DAL.MICROBIT_ID_IO_P10),
                new Pin(DAL.MICROBIT_ID_IO_P11),
                new Pin(DAL.MICROBIT_ID_IO_P12),
                new Pin(DAL.MICROBIT_ID_IO_P13),
                new Pin(DAL.MICROBIT_ID_IO_P14),
                new Pin(DAL.MICROBIT_ID_IO_P15),
                new Pin(DAL.MICROBIT_ID_IO_P16),
                null,
                null,
                new Pin(DAL.MICROBIT_ID_IO_P19),
                new Pin(DAL.MICROBIT_ID_IO_P20)
            ];
        }

        public getPin(id: number) {
            return this.pins.filter(p => p && p.id == id)[0] || null
        }
    }
}

namespace pxsim.pins {
    export function digitalReadPin(pinId: number): number {
        let pin = getPin(pinId);
        if (!pin) return;
        pin.mode = PinFlags.Digital | PinFlags.Input;
        return pin.value > 100 ? 1 : 0;
    }

    export function digitalWritePin(pinId: number, value: number) {
        let pin = getPin(pinId);
        if (!pin) return;
        pin.mode = PinFlags.Digital | PinFlags.Output;
        pin.value = value > 0 ? 1023 : 0;
        runtime.queueDisplayUpdate();
    }

    export function setPull(pinId: number, pull: number) {
        let pin = getPin(pinId);
        if (!pin) return;
        pin.pull = pull;
    }

    export function analogReadPin(pinId: number): number {
        let pin = getPin(pinId);
        if (!pin) return;
        pin.mode = PinFlags.Analog | PinFlags.Input;
        return pin.value || 0;
    }

    export function analogWritePin(pinId: number, value: number) {
        let pin = getPin(pinId);
        if (!pin) return;
        pin.mode = PinFlags.Analog | PinFlags.Output;
        pin.value = value ? 1 : 0;
        runtime.queueDisplayUpdate();
    }

    export function analogSetPeriod(pinId: number, micros: number) {
        let pin = getPin(pinId);
        if (!pin) return;
        pin.mode = PinFlags.Analog | PinFlags.Output;
        pin.period = micros;
        runtime.queueDisplayUpdate();
    }

    export function servoWritePin(pinId: number, value: number) {
        analogSetPeriod(pinId, 20000);
        // TODO
    }

    export function servoSetPulse(pinId: number, micros: number) {
        let pin = getPin(pinId);
        if (!pin) return;
        // TODO
    }

    export function analogSetPitchPin(pinId: number) {
        let pin = getPin(pinId);
        if (!pin) return;
        board().edgeConnectorState.pins.filter(p => !!p).forEach(p => p.pitch = false);
        pin.pitch = true;
    }

    export function analogPitch(frequency: number, ms: number) {
        // update analog output
        let pins = board().edgeConnectorState.pins;
        let pin = pins.filter(pin => !!pin && pin.pitch)[0] || pins[0];
        pin.mode = PinFlags.Analog | PinFlags.Output;
        if (frequency <= 0) {
            pin.value = 0;
            pin.period = 0;
        } else {
            pin.value = 512;
            pin.period = 1000000 / frequency;
        }
        runtime.queueDisplayUpdate();

        let cb = getResume();
        AudioContextManager.tone(frequency, 1);
        if (ms <= 0) cb();
        else {
            setTimeout(() => {
                AudioContextManager.stop();
                pin.value = 0;
                pin.period = 0;
                pin.mode = PinFlags.Unused;
                runtime.queueDisplayUpdate();
                cb()
            }, ms);
        }
    }
}