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

    export class Board extends BaseBoard {
        id: string;

        // the bus
        bus: EventBus;

        // display
        displayCmp: LedMatrixCmp;

        // pins
        edgeConnectorState: EdgeConnectorCmp;

        // serial
        serialCmp: SerialCmp;

        // accelerometer
        accelerometerCmp: AccelerometerCmp;

        // compass
        compassCmp: CompassCmp;

        // thermometer
        thermometerCmp: ThermometerCmp;

        // light sensor
        lightSensorCmp: LightSensorCmp;

        //buttons
        buttonPairState: ButtonPairCmp;

        //radio
        radioCmp: RadioCmp;

        constructor() {
            super()
            this.id = "b" + Math_.random(2147483647);
            this.bus = new EventBus(runtime);
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

        initAsync(msg: SimulatorRunMessage): Promise<void> {
            let options = (msg.options || {}) as RuntimeOptions;
            let theme: micro_bit.IBoardTheme;
            switch (options.theme) {
                case 'blue': theme = micro_bit.themes[0]; break;
                case 'yellow': theme = micro_bit.themes[1]; break;
                case 'green': theme = micro_bit.themes[2]; break;
                case 'red': theme = micro_bit.themes[3]; break;
                default: theme = pxsim.micro_bit.randomTheme();
            }
            let buttonPairTheme = pxsim.micro_bit.defaultButtonPairTheme;
            let edgeConnectorTheme = pxsim.micro_bit.defaultEdgeConnectorTheme;
            let accelerometerTheme = pxsim.micro_bit.defaultAccelerometerTheme;
            let radioTheme = pxsim.micro_bit.defaultRadioTheme;
            let displayTheme = pxsim.micro_bit.defaultLedMatrixTheme;
            let serialTheme = pxsim.micro_bit.defaultSerialTheme;
            let thermometerTheme = pxsim.micro_bit.defaultThermometerTheme;
            let lightSensorTheme = pxsim.micro_bit.defaultLightSensorTheme;
            let compassTheme = pxsim.micro_bit.defaultCompassTheme;
            
            compassTheme.color = theme.accent;

            console.log("setting up microbit simulator")
            let view = new pxsim.micro_bit.MicrobitBoardSvg({
                theme: theme,
                buttonPairTheme: buttonPairTheme,
                edgeConnectorTheme: edgeConnectorTheme,
                accelerometerTheme: accelerometerTheme,
                radioTheme: radioTheme,
                displayTheme: displayTheme,
                serialTheme: serialTheme,
                thermometerTheme: thermometerTheme,
                lightSensorTheme: lightSensorTheme,
                compassTheme: compassTheme,
                runtime: runtime
            })
            document.body.innerHTML = ""; // clear children
            document.body.appendChild(view.element);

            return Promise.resolve();
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