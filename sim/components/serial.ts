/// <reference path="../../node_modules/pxt-core/typings/bluebird/bluebird.d.ts"/>
/// <reference path="../../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../../libs/microbit/dal.d.ts"/>

namespace pxsim {
    export class SerialCmp {
        serialIn: string[] = [];

        public recieveData(data: string) {
            this.serialIn.push();
        }

        readSerial() {
            let v = this.serialIn.shift() || "";
            return v;
        }

        serialOutBuffer: string = "";
        writeSerial(s: string) {
            for (let i = 0; i < s.length; ++i) {
                let c = s[i];
                this.serialOutBuffer += c;
                if (c == "\n") {
                    Runtime.postMessage(<SimulatorSerialMessage>{
                        type: "serial",
                        data: this.serialOutBuffer,
                        id: runtime.id
                    })
                    this.serialOutBuffer = ""
                    break;
                }
            }
        }
    }
}

namespace pxsim.micro_bit {
    export interface ISerialTheme {
        systemLedStroke: string,
        systemLedFill: string
    }
    export var defaultSerialTheme: ISerialTheme = {
        systemLedStroke: "#555",
        systemLedFill: "#333"
    }

    export class SerialSvg {
        private systemLed: SVGCircleElement;

        public style = `
.sim-systemled {
    stroke-width: 1px;
}`;

        public updateTheme(theme: ISerialTheme) {
            if (this.systemLed) {
                this.systemLed.style.stroke = theme.systemLedStroke
                this.systemLed.style.fill = theme.systemLedFill
            }
        }

        private lastFlashTime: number = 0;
        public flashSystemLed(g: SVGElement, theme: ISerialTheme) {
            if (!this.systemLed) {
                this.systemLed = <SVGCircleElement>svg.child(g, "circle", { class: "sim-systemled", cx: 300, cy: 20, r: 5 })
                this.updateTheme(theme);
            }
            let now = Date.now();
            if (now - this.lastFlashTime > 150) {
                this.lastFlashTime = now;
                svg.animate(this.systemLed, "sim-flash")
            }
        }

        public attachEvents(g: SVGElement, theme: ISerialTheme) {
            Runtime.messagePosted = (msg) => {
                switch (msg.type || '') {
                    case 'serial': this.flashSystemLed(g, theme); break;
                }
            }
        }
    }
}


namespace pxsim.serial {
    export function writeString(s: string) {
        board().writeSerial(s);
    }

    export function readString(): string {
        return board().serialCmp.readSerial();
    }

    export function readLine(): string {
        return board().serialCmp.readSerial();
    }

    export function onDataReceived(delimiters: string, handler: RefAction) {
        let b = board();
        b.bus.listen(DAL.MICROBIT_ID_SERIAL, DAL.MICROBIT_SERIAL_EVT_DELIM_MATCH, handler);
    }

    export function redirect(tx: number, rx: number, rate: number) {
        // TODO?
    }
}