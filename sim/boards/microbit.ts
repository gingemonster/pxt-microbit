/// <reference path="../../node_modules/pxt-core/typings/bluebird/bluebird.d.ts"/>
/// <reference path="../../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../../libs/microbit/dal.d.ts"/>

namespace pxsim {

    export class MicrobitBoard extends DalBoard {
        constructor() {
            super()
        }

        initAsync(msg: SimulatorRunMessage): Promise<void> {
            let options = (msg.options || {}) as RuntimeOptions;
            let theme: boardsvg.IMicrobitTheme;
            switch (options.theme) {
                case 'blue': theme = boardsvg.mkTheme(boardsvg.accents[0]); break;
                case 'yellow': theme = boardsvg.mkTheme(boardsvg.accents[1]); break;
                case 'green': theme = boardsvg.mkTheme(boardsvg.accents[2]); break;
                case 'red': theme = boardsvg.mkTheme(boardsvg.accents[3]); break;
                default: theme = pxsim.boardsvg.randomTheme();
            }
            
            theme.compassTheme.color = theme.accent;

            console.log("setting up microbit simulator")
            let view = new pxsim.boardsvg.MicrobitSvg({
                theme: theme,
                runtime: runtime
            })
            document.body.innerHTML = ""; // clear children
            document.body.appendChild(view.element);

            return Promise.resolve();
        }
    }
}

namespace pxsim.boardsvg {
    const svg = pxsim.svg;

    export interface IMicrobitTheme {
        accent?: string;
        buttonPairTheme: IButtonPairTheme;
        edgeConnectorTheme: IEdgeConnectorTheme;
        accelerometerTheme: IAccelerometerTheme;
        radioTheme: IRadioTheme;
        displayTheme: ILedMatrixTheme;
        serialTheme: ISerialTheme;
        thermometerTheme: IThermometerTheme;
        lightSensorTheme: ILightSensorTheme;
        compassTheme: ICompassTheme;
    }

    export var accents = ["#3ADCFE", "#FFD43A", "#3AFFB3", "#FF3A54"];

    export function mkTheme(accent: string): IMicrobitTheme {
        return {
            accent: accent,
            buttonPairTheme: defaultButtonPairTheme,
            edgeConnectorTheme: defaultEdgeConnectorTheme,
            accelerometerTheme: defaultAccelerometerTheme,
            radioTheme: defaultRadioTheme,
            displayTheme: defaultLedMatrixTheme,
            serialTheme: defaultSerialTheme,
            thermometerTheme: defaultThermometerTheme,
            lightSensorTheme: defaultLightSensorTheme,
            compassTheme: defaultCompassTheme,
        }
    }

    export function randomTheme(): IMicrobitTheme {
        let accent = accents[Math.floor(Math.random() * accents.length)];
        return mkTheme(accent);
    }

    export interface IMicrobitProps {
        runtime: pxsim.Runtime;
        theme?: IMicrobitTheme;
        disableTilt?: boolean;
    }

    export class MicrobitSvg {
        public element: SVGSVGElement;
        private style: SVGStyleElement;
        private defs: SVGDefsElement;
        private g: SVGElement;

        private logos: SVGElement[];
        public board: pxsim.MicrobitBoard;

        private compassSvg = new CompassSvg();
        private displaySvg = new LedMatrixSvg();
        private buttonPairSvg = new ButtonPairSvg();
        private edgeConnectorSvg = new EdgeConnectorSvg();
        private serialSvg = new SerialSvg();
        private radioSvg = new RadioSvg();
        private thermometerSvg = new ThermometerSvg();
        private accelerometerSvg = new AccelerometerSvg();
        private lightSensorSvg = new LightSensorSvg();

        constructor(public props: IMicrobitProps) {
            this.board = this.props.runtime.board as pxsim.MicrobitBoard;
            this.board.updateView = () => this.updateState();
            this.buildDom();
            this.updateTheme();
            this.updateState();
            this.attachEvents();
        }

        private updateTheme() {
            let theme = this.props.theme;

            svg.fills(this.logos, theme.accent);

            this.buttonPairSvg.updateTheme(theme.buttonPairTheme);
            this.edgeConnectorSvg.updateTheme(theme.edgeConnectorTheme);
            this.accelerometerSvg.updateTheme(theme.accelerometerTheme);
            this.radioSvg.updateTheme(theme.radioTheme);
            this.displaySvg.updateTheme(theme.displayTheme);
            this.serialSvg.updateTheme(theme.serialTheme);
            this.thermometerSvg.updateTheme(theme.thermometerTheme);
            this.lightSensorSvg.updateTheme(theme.lightSensorTheme);
        }

        public updateState() {
            let state = this.board;
            if (!state) return;
            let theme = this.props.theme;

            this.displaySvg.updateState(state.displayCmp);
            this.buttonPairSvg.updateState(state.buttonPairState, this.props.theme.buttonPairTheme);
            this.edgeConnectorSvg.updateState(this.g, state.edgeConnectorState, this.props.theme.edgeConnectorTheme);
            this.accelerometerSvg.updateState(this.g, state.accelerometerCmp, this.props.theme.accelerometerTheme, pointerEvents, state.bus, !this.props.disableTilt, this.element);
            this.thermometerSvg.updateState(state.thermometerCmp, this.g, this.element, this.props.theme.thermometerTheme, this.defs);
            this.lightSensorSvg.updateState(state.lightSensorCmp, this.g, this.element, this.props.theme.lightSensorTheme, this.defs);
            this.compassSvg.updateState(state.compassCmp, this.props.theme.compassTheme, this.element);

            if (!runtime || runtime.dead) svg.addClass(this.element, "grayscale");
            else svg.removeClass(this.element, "grayscale");
        }

        private buildDom() {
            this.element = <SVGSVGElement>svg.elt("svg")
            svg.hydrate(this.element, {
                "version": "1.0",
                "viewBox": "0 0 498 406",
                "enable-background": "new 0 0 498 406",
                "class": "sim",
                "x": "0px",
                "y": "0px"
            });
            this.style = <SVGStyleElement>svg.child(this.element, "style", {});
            //TODO(DZ): generalize flash animation for components 
            this.style.textContent = `
svg.sim {
    margin-bottom:1em;
}
svg.sim.grayscale {    
    -moz-filter: grayscale(1);
    -webkit-filter: grayscale(1);
    filter: grayscale(1);
}

.sim-text {
font-family:"Lucida Console", Monaco, monospace;
font-size:25px;
fill:#fff;
pointer-events: none;
}

/* animations */
.sim-theme-glow {
    animation-name: sim-theme-glow-animation;
    animation-timing-function: ease-in-out;
    animation-direction: alternate;
    animation-iteration-count: infinite;
    animation-duration: 1.25s;
}
@keyframes sim-theme-glow-animation {  
    from { opacity: 1; }
    to   { opacity: 0.75; }
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
            this.style.textContent += this.buttonPairSvg.style;
            this.style.textContent += this.edgeConnectorSvg.style;
            this.style.textContent += this.radioSvg.style;
            this.style.textContent += this.displaySvg.style;
            this.style.textContent += this.serialSvg.style;
            this.style.textContent += this.thermometerSvg.style;
            this.style.textContent += this.lightSensorSvg.style;

            this.defs = <SVGDefsElement>svg.child(this.element, "defs", {});
            this.g = svg.elt("g");
            this.element.appendChild(this.g);

            // filters
            let glow = svg.child(this.defs, "filter", { id: "filterglow", x: "-5%", y: "-5%", width: "120%", height: "120%" });
            svg.child(glow, "feGaussianBlur", { stdDeviation: "5", result: "glow" });
            let merge = svg.child(glow, "feMerge", {});
            for (let i = 0; i < 3; ++i) svg.child(merge, "feMergeNode", { in: "glow" })

            // outline
            svg.path(this.g, "sim-board", "M498,31.9C498,14.3,483.7,0,466.1,0H31.9C14.3,0,0,14.3,0,31.9v342.2C0,391.7,14.3,406,31.9,406h434.2c17.6,0,31.9-14.3,31.9-31.9V31.9z M14.3,206.7c-2.7,0-4.8-2.2-4.8-4.8c0-2.7,2.2-4.8,4.8-4.8c2.7,0,4.8,2.2,4.8,4.8C19.2,204.6,17,206.7,14.3,206.7z M486.2,206.7c-2.7,0-4.8-2.2-4.8-4.8c0-2.72.2-4.8,4.8-4.8c2.7,0,4.8,2.2,4.8,4.8C491,204.6,488.8,206.7,486.2,206.7z");

            // script background
            this.logos = [];
            this.logos.push(svg.child(this.g, "polygon", { class: "sim-theme", points: "115,56.7 173.1,0 115,0" }));
            this.logos.push(svg.path(this.g, "sim-theme", "M114.2,0H25.9C12.1,2.1,0,13.3,0,27.7v83.9L114.2,0z"));
            this.logos.push(svg.child(this.g, "polygon", { class: "sim-theme", points: "173,27.9 202.5,0 173,0" }));
            this.logos.push(svg.child(this.g, "polygon", { class: "sim-theme", points: "54.1,242.4 54.1,274.1 22.4,274.1" }));
            this.logos.push(svg.child(this.g, "polygon", { class: "sim-theme", points: "446.2,164.6 446.2,132.8 477.9,132.8" }));

            // display 
            this.displaySvg.buildDom(this.g);

            // compass
            this.compassSvg.buildDom(this.g);

            // pins
            this.edgeConnectorSvg.buildDom(this.g, this.defs);

            // buttons
            this.buttonPairSvg.buildDom(this.g);
            
            // labels
            svg.path(this.g, "sim-label", "M35.7,376.4c0-2.8,2.1-5.1,5.5-5.1c3.3,0,5.5,2.4,5.5,5.1v4.7c0,2.8-2.2,5.1-5.5,5.1c-3.3,0-5.5-2.4-5.5-5.1V376.4zM43.3,376.4c0-1.3-0.8-2.3-2.2-2.3c-1.3,0-2.1,1.1-2.1,2.3v4.7c0,1.2,0.8,2.3,2.1,2.3c1.3,0,2.2-1.1,2.2-2.3V376.4z");
            svg.path(this.g, "sim-label", "M136.2,374.1c2.8,0,3.4-0.8,3.4-2.5h2.9v14.3h-3.4v-9.5h-3V374.1z");
            svg.path(this.g, "sim-label", "M248.6,378.5c1.7-1,3-1.7,3-3.1c0-1.1-0.7-1.6-1.6-1.6c-1,0-1.8,0.6-1.8,2.1h-3.3c0-2.6,1.8-4.6,5.1-4.6c2.6,0,4.9,1.3,4.9,4.3c0,2.4-2.3,3.9-3.8,4.7c-2,1.3-2.5,1.8-2.5,2.9h6.1v2.7h-10C244.8,381.2,246.4,379.9,248.6,378.5z");

            svg.path(this.g, "sim-button-label", "M48.1,270.9l-0.6-1.7h-5.1l-0.6,1.7h-3.5l5.1-14.3h3.1l5.2,14.3H48.1z M45,260.7l-1.8,5.9h3.5L45,260.7z");
            svg.path(this.g, "sim-button-label", "M449.1,135.8h5.9c3.9,0,4.7,2.4,4.7,3.9c0,1.8-1.4,2.9-2.5,3.2c0.9,0,2.6,1.1,2.6,3.3c0,1.5-0.8,4-4.7,4h-6V135.8zM454.4,141.7c1.6,0,2-1,2-1.7c0-0.6-0.3-1.7-2-1.7h-2v3.4H454.4z M452.4,144.1v3.5h2.1c1.6,0,2-1,2-1.8c0-0.7-0.4-1.8-2-1.8H452.4z")

            svg.path(this.g, "sim-label", "M352.1,381.1c0,1.6,0.9,2.5,2.2,2.5c1.2,0,1.9-0.9,1.9-1.9c0-1.2-0.6-2-2.1-2h-1.3v-2.6h1.3c1.5,0,1.9-0.7,1.9-1.8c0-1.1-0.7-1.6-1.6-1.6c-1.4,0-1.8,0.8-1.8,2.1h-3.3c0-2.4,1.5-4.6,5.1-4.6c2.6,0,5,1.3,5,4c0,1.6-1,2.8-2.1,3.2c1.3,0.5,2.3,1.6,2.3,3.5c0,2.7-2.4,4.3-5.2,4.3c-3.5,0-5.5-2.1-5.5-5.1H352.1z")
            svg.path(this.g, "sim-label", "M368.5,385.9h-3.1l-5.1-14.3h3.5l3.1,10.1l3.1-10.1h3.6L368.5,385.9z")
            svg.path(this.g, "sim-label", "M444.4,378.3h7.4v2.5h-1.5c-0.6,3.3-3,5.5-7.1,5.5c-4.8,0-7.5-3.5-7.5-7.5c0-3.9,2.8-7.5,7.5-7.5c3.8,0,6.4,2.3,6.6,5h-3.5c-0.2-1.1-1.4-2.2-3.1-2.2c-2.7,0-4.1,2.3-4.1,4.7c0,2.5,1.4,4.7,4.4,4.7c2,0,3.2-1.2,3.4-2.7h-2.5V378.3z")
            svg.path(this.g, "sim-label", "M461.4,380.9v-9.3h3.3v14.3h-3.5l-5.2-9.2v9.2h-3.3v-14.3h3.5L461.4,380.9z")
            svg.path(this.g, "sim-label", "M472.7,371.6c4.8,0,7.5,3.5,7.5,7.2s-2.7,7.2-7.5,7.2h-5.3v-14.3H472.7z M470.8,374.4v8.6h1.8c2.7,0,4.2-2.1,4.2-4.3s-1.6-4.3-4.2-4.3H470.8z")
        }

        private attachEvents() {
            this.serialSvg.attachEvents(this.g, this.props.theme.serialTheme);
            this.radioSvg.attachEvents(this.g, this.props.theme.radioTheme);
            this.accelerometerSvg.attachEvents(this.board.accelerometerCmp, !this.props.disableTilt, this.element);
            this.edgeConnectorSvg.attachEvents(this.board.bus, this.board.edgeConnectorState, this.element);
            this.buttonPairSvg.attachEvents(this.board.bus, this.board.buttonPairState, this.props.theme.accelerometerTheme);
        }
    }
}