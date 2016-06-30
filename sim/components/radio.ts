/// <reference path="../../node_modules/pxt-core/typings/bluebird/bluebird.d.ts"/>
/// <reference path="../../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../../libs/microbit/dal.d.ts"/>

namespace pxsim {
    export interface PacketBuffer {
        data: number[] | string;
        rssi?: number;
    }

    export class RadioDatagram {
        datagram: PacketBuffer[] = [];
        lastReceived: PacketBuffer = {
            data: [0, 0, 0, 0],
            rssi: -1
        };

        constructor(private runtime: Runtime) {
        }

        queue(packet: PacketBuffer) {
            if (this.datagram.length < 5) {
                this.datagram.push(packet);
                (<Board>runtime.board).bus.queue(DAL.MICROBIT_ID_RADIO, DAL.MICROBIT_RADIO_EVT_DATAGRAM);
            }
        }

        send(buffer: number[] | string) {
            if (buffer instanceof String) buffer = buffer.slice(0, 32);
            else buffer = buffer.slice(0, 8);

            Runtime.postMessage(<SimulatorRadioPacketMessage>{
                type: "radiopacket",
                data: buffer
            })
        }

        recv(): PacketBuffer {
            let r = this.datagram.shift();
            if (!r) r = {
                data: [0, 0, 0, 0],
                rssi: -1
            };
            return this.lastReceived = r;
        }
    }

    export class RadioBus {
        // uint8_t radioDefaultGroup = MICROBIT_RADIO_DEFAULT_GROUP;
        groupId = 0; // todo
        power = 0;
        transmitSerialNumber = false;
        datagram: RadioDatagram;

        constructor(private runtime: Runtime) {
            this.datagram = new RadioDatagram(runtime);
        }

        setGroup(id: number) {
            this.groupId = id & 0xff; // byte only
        }

        setTransmitPower(power: number) {
            this.power = Math.max(0, Math.min(7, power));
        }

        setTransmitSerialNumber(sn: boolean) {
            this.transmitSerialNumber = !!sn;
        }

        broadcast(msg: number) {
            Runtime.postMessage(<SimulatorEventBusMessage>{
                type: "eventbus",
                id: DAL.MES_BROADCAST_GENERAL_ID,
                eventid: msg,
                power: this.power,
                group: this.groupId
            })
        }
    }

    export class RadioCmp {
        bus: RadioBus;

        constructor(runtime: Runtime) {
            this.bus = new RadioBus(runtime);
        }

        public recievePacket(packet: SimulatorRadioPacketMessage) {
            this.bus.datagram.queue({ data: packet.data, rssi: packet.rssi || 0 })
        }
    }
}

namespace pxsim.micro_bit {
    export interface IRadioTheme {
        antenna?: string
        //TODO(DZ): parameterize flash color
    }

    export var defaultRadioTheme = {
        antenna: "#555"
    };

    export class RadioSvg {
        private antenna: SVGPolylineElement;
        public style = `
.sim-antenna {
    stroke-width: 2px;
}

.sim-flash {
    animation-name: sim-flash-animation;
    animation-duration: 0.1s;
}

@keyframes sim-flash-animation {  
    from { fill: yellow; }
    to   { fill: default; }
}

.sim-flash-stroke {
    animation-name: sim-flash-stroke-animation;
    animation-duration: 0.4s;
    animation-timing-function: ease-in;
}

@keyframes sim-flash-stroke-animation {  
    from { stroke: yellow; }
    to   { stroke: default; }
}
`;

        public updateTheme(theme: IRadioTheme) {
            if (this.antenna) this.antenna.style.stroke = theme.antenna;
        }

        private lastAntennaFlash: number = 0;
        public flashAntenna(g: SVGElement, theme: IRadioTheme) {
            if (!this.antenna) {
                let ax = 380;
                let dax = 18;
                let ayt = 10;
                let ayb = 40;
                this.antenna = <SVGPolylineElement>svg.child(g, "polyline", { class: "sim-antenna", points: `${ax},${ayb} ${ax},${ayt} ${ax += dax},${ayt} ${ax},${ayb} ${ax += dax},${ayb} ${ax},${ayt} ${ax += dax},${ayt} ${ax},${ayb} ${ax += dax},${ayb} ${ax},${ayt} ${ax += dax},${ayt}` })
                this.updateTheme(theme);
            }
            let now = Date.now();
            if (now - this.lastAntennaFlash > 200) {
                this.lastAntennaFlash = now;
                svg.animate(this.antenna, 'sim-flash-stroke')
            }
        }

        public attachEvents(g: SVGElement, theme: IRadioTheme) {
            Runtime.messagePosted = (msg) => {
                switch (msg.type || '') {
                    case 'radiopacket': this.flashAntenna(g, theme); break;
                }
            }
        }
    }
}

namespace pxsim.radio {
    export function broadcastMessage(msg: number): void {
        board().radioCmp.bus.broadcast(msg);
    }

    export function onBroadcastMessageReceived(msg: number, handler: RefAction): void {
        pxt.registerWithDal(DAL.MES_BROADCAST_GENERAL_ID, msg, handler);
    }

    export function setGroup(id: number): void {
        board().radioCmp.bus.setGroup(id);
    }

    export function setTransmitPower(power: number): void {
        board().radioCmp.bus.setTransmitPower(power);
    }

    export function setTransmitSerialNumber(transmit: boolean): void {
        board().radioCmp.bus.setTransmitSerialNumber(transmit);
    }

    export function sendNumber(value: number): void {
        board().radioCmp.bus.datagram.send([value]);
    }

    export function sendString(msg: string): void {
        board().radioCmp.bus.datagram.send(msg);
    }

    export function writeValueToSerial(): void {
        let b = board();
        let v = b.radioCmp.bus.datagram.recv().data[0];
        b.writeSerial(`{v:${v}}`);
    }

    export function sendValue(name: string, value: number) {
        board().radioCmp.bus.datagram.send([value]);
    }

    export function receiveNumber(): number {
        let buffer = board().radioCmp.bus.datagram.recv().data;
        if (buffer instanceof Array) return buffer[0];

        return 0;
    }

    export function receiveString(): string {
        let buffer = board().radioCmp.bus.datagram.recv().data;
        if (typeof buffer === "string") return <string>buffer;
        return "";
    }

    export function receivedNumberAt(index: number): number {
        let buffer = board().radioCmp.bus.datagram.recv().data;
        if (buffer instanceof Array) return buffer[index] || 0;

        return 0;
    }

    export function receivedSignalStrength(): number {
        return board().radioCmp.bus.datagram.lastReceived.rssi;
    }

    export function onDataReceived(handler: RefAction): void {
        pxt.registerWithDal(DAL.MICROBIT_ID_RADIO, DAL.MICROBIT_RADIO_EVT_DATAGRAM, handler);
    }
}