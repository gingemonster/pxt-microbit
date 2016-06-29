namespace pxsim.micro_bit {
    const svg = pxsim.svg;

    export interface IBoardTheme {
        accent?: string;
        display?: string;
        ledOn?: string;
        ledOff?: string;
        lightLevelOn?: string;
        lightLevelOff?: string;
    }

    export var themes: IBoardTheme[] = ["#3ADCFE", "#FFD43A", "#3AFFB3", "#FF3A54"].map(accent => {
        return {
            accent: accent,
            display: "#000",
            ledOn: "#ff7f7f",
            ledOff: "#202020",
            lightLevelOn: "yellow",
            lightLevelOff: "#555"
        }
    });

    export function randomTheme(): IBoardTheme {
        return themes[Math.floor(Math.random() * themes.length)];
    }

    export interface IBoardProps {
        runtime: pxsim.Runtime;
        theme?: IBoardTheme;
        buttonPairTheme?: IButtonPairTheme;
        edgeConnectorTheme?: IEdgeConnectorTheme;
        disableTilt?: boolean;
    }

    export interface IPointerEvents {
        up: string,
        down: string,
        move: string,
        leave: string
    }

    const pointerEvents: IPointerEvents = !!(window as any).PointerEvent ? {
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

    export class MicrobitBoardSvg {
        public element: SVGSVGElement;
        private style: SVGStyleElement;
        private defs: SVGDefsElement;
        private g: SVGElement;

        private logos: SVGElement[];
        private head: SVGGElement; private headInitialized = false;
        private headText: SVGTextElement;
        private display: SVGElement;
        private buttonPairSvg = new ButtonPairSvg();
        private edgeConnectorSvg = new EdgeConnectorSvg();
        private ledsOuter: SVGElement[];
        private leds: SVGElement[];
        private systemLed: SVGCircleElement;
        private antenna: SVGPolylineElement;
        private lightLevelButton: SVGCircleElement;
        private lightLevelGradient: SVGLinearGradientElement;
        private lightLevelText: SVGTextElement;
        private thermometerGradient: SVGLinearGradientElement;
        private thermometer: SVGRectElement;
        private thermometerText: SVGTextElement;
        private shakeButton: SVGCircleElement;
        private shakeText: SVGTextElement;
        public board: pxsim.Board;

        constructor(public props: IBoardProps) {
            this.board = this.props.runtime.board as pxsim.Board;
            this.board.updateView = () => this.updateState();
            this.buildDom();
            this.updateTheme();
            this.updateState();
            this.attachEvents();
        }

        private updateTheme() {
            let theme = this.props.theme;
            let buttonPairTheme = this.props.buttonPairTheme;
            let edgeConnectorTheme = this.props.edgeConnectorTheme;

            svg.fill(this.display, theme.display);
            svg.fills(this.leds, theme.ledOn);
            svg.fills(this.ledsOuter, theme.ledOff);
            svg.fills(this.logos, theme.accent);
            if (this.shakeButton) svg.fill(this.shakeButton, buttonPairTheme.virtualButtonUp);

            svg.setGradientColors(this.lightLevelGradient, theme.lightLevelOn, theme.lightLevelOff);

            svg.setGradientColors(this.thermometerGradient, theme.ledOff, theme.ledOn);

            this.buttonPairSvg.updateTheme(buttonPairTheme);
            this.edgeConnectorSvg.updateTheme(edgeConnectorTheme);
        }

        public updateState() {
            let state = this.board;
            if (!state) return;
            let theme = this.props.theme;

            let bw = state.displayMode == pxsim.DisplayMode.bw
            let img = state.image;
            this.leds.forEach((led, i) => {
                let sel = (<SVGStylable><any>led)
                sel.style.opacity = ((bw ? img.data[i] > 0 ? 255 : 0 : img.data[i]) / 255.0) + "";
            })
            this.updateTilt();
            this.updateHeading();
            this.updateLightLevel();
            this.updateTemperature();
            this.updateGestures();

            this.buttonPairSvg.updateState(this.g, state.buttonPairState, this.props.buttonPairTheme);
            this.edgeConnectorSvg.updateState(this.g, state.edgeConnectorState, this.props.edgeConnectorTheme);

            if (!runtime || runtime.dead) svg.addClass(this.element, "grayscale");
            else svg.removeClass(this.element, "grayscale");
        }

        private updateGestures() {
            let state = this.board;
            if (state.useShake && !this.shakeButton) {
                this.shakeButton = svg.child(this.g, "circle", { cx: 380, cy: 100, r: 16.5 }) as SVGCircleElement;
                svg.fill(this.shakeButton, this.props.buttonPairTheme.virtualButtonUp)
                this.shakeButton.addEventListener(pointerEvents.down, ev => {
                    let state = this.board;
                    svg.fill(this.shakeButton, this.props.buttonPairTheme.buttonDown);
                })
                this.shakeButton.addEventListener(pointerEvents.leave, ev => {
                    let state = this.board;
                    svg.fill(this.shakeButton, this.props.buttonPairTheme.virtualButtonUp);
                })
                this.shakeButton.addEventListener(pointerEvents.up, ev => {
                    let state = this.board;
                    svg.fill(this.shakeButton, this.props.buttonPairTheme.virtualButtonUp);
                    this.board.bus.queue(DAL.MICROBIT_ID_GESTURE, 11); // GESTURE_SHAKE
                })
                this.shakeText = svg.child(this.g, "text", { x: 400, y: 110, class: "sim-text" }) as SVGTextElement;
                this.shakeText.textContent = "SHAKE"
            }
        }

        private updateTemperature() {
            let state = this.board;
            if (!state || !state.usesTemperature) return;

            let tmin = -5;
            let tmax = 50;
            if (!this.thermometer) {
                let gid = "gradient-thermometer";
                this.thermometerGradient = svg.linearGradient(this.defs, gid);
                this.thermometer = <SVGRectElement>svg.child(this.g, "rect", {
                    class: "sim-thermometer",
                    x: 120,
                    y: 110,
                    width: 20,
                    height: 160,
                    rx: 5, ry: 5,
                    fill: `url(#${gid})`
                });
                this.thermometerText = svg.child(this.g, "text", { class: 'sim-text', x: 58, y: 130 }) as SVGTextElement;
                this.updateTheme();

                let pt = this.element.createSVGPoint();
                svg.buttonEvents(this.thermometer,
                    (ev) => {
                        let cur = svg.cursorPoint(pt, this.element, ev);
                        let t = Math.max(0, Math.min(1, (260 - cur.y) / 140))
                        state.temperature = Math.floor(tmin + t * (tmax - tmin));
                        this.updateTemperature();
                    }, ev => { }, ev => { })
            }

            let t = Math.max(tmin, Math.min(tmax, state.temperature))
            let per = Math.floor((state.temperature - tmin) / (tmax - tmin) * 100)
            svg.setGradientValue(this.thermometerGradient, 100 - per + "%");
            this.thermometerText.textContent = t + "°C";
        }

        private updateHeading() {
            let xc = 258;
            let yc = 75;
            let state = this.board;
            if (!state || !state.usesHeading) return;
            if (!this.headInitialized) {
                let p = this.head.firstChild.nextSibling as SVGPathElement;
                p.setAttribute("d", "m269.9,50.134647l0,0l-39.5,0l0,0c-14.1,0.1 -24.6,10.7 -24.6,24.8c0,13.9 10.4,24.4 24.3,24.7l0,0l39.6,0c14.2,0 40.36034,-22.97069 40.36034,-24.85394c0,-1.88326 -26.06034,-24.54606 -40.16034,-24.64606m-0.2,39l0,0l-39.3,0c-7.7,-0.1 -14,-6.4 -14,-14.2c0,-7.8 6.4,-14.2 14.2,-14.2l39.1,0c7.8,0 14.2,6.4 14.2,14.2c0,7.9 -6.4,14.2 -14.2,14.2l0,0l0,0z");
                this.updateTheme();
                let pt = this.element.createSVGPoint();
                svg.buttonEvents(
                    this.head,
                    (ev: MouseEvent) => {
                        let cur = svg.cursorPoint(pt, this.element, ev);
                        state.heading = Math.floor(Math.atan2(cur.y - yc, cur.x - xc) * 180 / Math.PI + 90);
                        if (state.heading < 0) state.heading += 360;
                        this.updateHeading();
                    });
                this.headInitialized = true;
            }

            let txt = state.heading.toString() + "°";
            if (txt != this.headText.textContent) {
                svg.rotateElement(this.head, xc, yc, state.heading + 180);
                this.headText.textContent = txt;
            }
        }

        private lastFlashTime: number = 0;
        public flashSystemLed() {
            if (!this.systemLed)
                this.systemLed = <SVGCircleElement>svg.child(this.g, "circle", { class: "sim-systemled", cx: 300, cy: 20, r: 5 })
            let now = Date.now();
            if (now - this.lastFlashTime > 150) {
                this.lastFlashTime = now;
                svg.animate(this.systemLed, "sim-flash")
            }
        }

        private lastAntennaFlash: number = 0;
        public flashAntenna() {
            if (!this.antenna) {
                let ax = 380;
                let dax = 18;
                let ayt = 10;
                let ayb = 40;
                this.antenna = <SVGPolylineElement>svg.child(this.g, "polyline", { class: "sim-antenna", points: `${ax},${ayb} ${ax},${ayt} ${ax += dax},${ayt} ${ax},${ayb} ${ax += dax},${ayb} ${ax},${ayt} ${ax += dax},${ayt} ${ax},${ayb} ${ax += dax},${ayb} ${ax},${ayt} ${ax += dax},${ayt}` })
            }
            let now = Date.now();
            if (now - this.lastAntennaFlash > 200) {
                this.lastAntennaFlash = now;
                svg.animate(this.antenna, 'sim-flash-stroke')
            }
        }

        private updateLightLevel() {
            let state = this.board;
            if (!state || !state.usesLightLevel) return;

            if (!this.lightLevelButton) {
                let gid = "gradient-light-level";
                this.lightLevelGradient = svg.linearGradient(this.defs, gid)
                let cy = 50;
                let r = 35;
                this.lightLevelButton = svg.child(this.g, "circle", {
                    cx: `50px`, cy: `${cy}px`, r: `${r}px`,
                    class: 'sim-light-level-button',
                    fill: `url(#${gid})`
                }) as SVGCircleElement;
                let pt = this.element.createSVGPoint();
                svg.buttonEvents(this.lightLevelButton,
                    (ev) => {
                        let pos = svg.cursorPoint(pt, this.element, ev);
                        let rs = r / 2;
                        let level = Math.max(0, Math.min(255, Math.floor((pos.y - (cy - rs)) / (2 * rs) * 255)));
                        if (level != this.board.lightLevel) {
                            this.board.lightLevel = level;
                            this.applyLightLevel();
                        }
                    }, ev => { },
                    ev => { })
                this.lightLevelText = svg.child(this.g, "text", { x: 85, y: cy + r - 5, text: '', class: 'sim-text' }) as SVGTextElement;
                this.updateTheme();
            }

            svg.setGradientValue(this.lightLevelGradient, Math.min(100, Math.max(0, Math.floor(state.lightLevel * 100 / 255))) + '%')
            this.lightLevelText.textContent = state.lightLevel.toString();
        }

        private applyLightLevel() {
            let lv = this.board.lightLevel;
            svg.setGradientValue(this.lightLevelGradient, Math.min(100, Math.max(0, Math.floor(lv * 100 / 255))) + '%')
            this.lightLevelText.textContent = lv.toString();
        }

        private updateTilt() {
            if (this.props.disableTilt) return;
            let state = this.board;
            if (!state || !state.accelerometer.isActive) return;

            let x = state.accelerometer.getX();
            let y = state.accelerometer.getY();
            let af = 8 / 1023;

            this.element.style.transform = "perspective(30em) rotateX(" + y * af + "deg) rotateY(" + x * af + "deg)"
            this.element.style.perspectiveOrigin = "50% 50% 50%";
            this.element.style.perspective = "30em";
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
            this.style.textContent = `
svg.sim {
    margin-bottom:1em;
}
svg.sim.grayscale {    
    -moz-filter: grayscale(1);
    -webkit-filter: grayscale(1);
    filter: grayscale(1);
}

.sim-led-back:hover {
    stroke:#a0a0a0;
    stroke-width:3px;
}
.sim-led:hover {
    stroke:#ff7f7f;
    stroke-width:3px;
}

.sim-systemled {
    fill:#333;
    stroke:#555;
    stroke-width: 1px;
}

.sim-light-level-button {
    stroke:#fff;
    stroke-width: 3px;
}

.sim-antenna {
    stroke:#555;
    stroke-width: 2px;
}

.sim-text {
  font-family:"Lucida Console", Monaco, monospace;
  font-size:25px;
  fill:#fff;
  pointer-events: none;
}

.sim-thermometer {
    stroke:#aaa;
    stroke-width: 3px;
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
            this.display = svg.path(this.g, "sim-display", "M333.8,310.3H165.9c-8.3,0-15-6.7-15-15V127.5c0-8.3,6.7-15,15-15h167.8c8.3,0,15,6.7,15,15v167.8C348.8,303.6,342.1,310.3,333.8,310.3z");

            this.logos = [];
            this.logos.push(svg.child(this.g, "polygon", { class: "sim-theme", points: "115,56.7 173.1,0 115,0" }));
            this.logos.push(svg.path(this.g, "sim-theme", "M114.2,0H25.9C12.1,2.1,0,13.3,0,27.7v83.9L114.2,0z"));
            this.logos.push(svg.child(this.g, "polygon", { class: "sim-theme", points: "173,27.9 202.5,0 173,0" }));
            this.logos.push(svg.child(this.g, "polygon", { class: "sim-theme", points: "54.1,242.4 54.1,274.1 22.4,274.1" }));
            this.logos.push(svg.child(this.g, "polygon", { class: "sim-theme", points: "446.2,164.6 446.2,132.8 477.9,132.8" }));

            // leds
            this.leds = [];
            this.ledsOuter = [];
            let left = 154, top = 113, ledoffw = 46, ledoffh = 44;
            for (let i = 0; i < 5; ++i) {
                let ledtop = i * ledoffh + top;
                for (let j = 0; j < 5; ++j) {
                    let ledleft = j * ledoffw + left;
                    let k = i * 5 + j;
                    this.ledsOuter.push(svg.child(this.g, "rect", { class: "sim-led-back", x: ledleft, y: ledtop, width: 10, height: 20, rx: 2, ry: 2 }));
                    this.leds.push(svg.child(this.g, "rect", { class: "sim-led", x: ledleft - 2, y: ledtop - 2, width: 14, height: 24, rx: 3, ry: 3, title: `(${j},${i})` }));
                }
            }

            // head
            this.head = <SVGGElement>svg.child(this.g, "g", {});
            svg.child(this.head, "circle", { cx: 258, cy: 75, r: 100, fill: "transparent" })
            this.logos.push(svg.path(this.head, "sim-theme sim-theme-glow", "M269.9,50.2L269.9,50.2l-39.5,0v0c-14.1,0.1-24.6,10.7-24.6,24.8c0,13.9,10.4,24.4,24.3,24.7v0h39.6c14.2,0,24.8-10.6,24.8-24.7C294.5,61,284,50.3,269.9,50.2 M269.7,89.2L269.7,89.2l-39.3,0c-7.7-0.1-14-6.4-14-14.2c0-7.8,6.4-14.2,14.2-14.2h39.1c7.8,0,14.2,6.4,14.2,14.2C283.9,82.9,277.5,89.2,269.7,89.2"));
            this.logos.push(svg.path(this.head, "sim-theme sim-theme-glow", "M230.6,69.7c-2.9,0-5.3,2.4-5.3,5.3c0,2.9,2.4,5.3,5.3,5.3c2.9,0,5.3-2.4,5.3-5.3C235.9,72.1,233.5,69.7,230.6,69.7"));
            this.logos.push(svg.path(this.head, "sim-theme sim-theme-glow", "M269.7,80.3c2.9,0,5.3-2.4,5.3-5.3c0-2.9-2.4-5.3-5.3-5.3c-2.9,0-5.3,2.4-5.3,5.3C264.4,77.9,266.8,80.3,269.7,80.3"));
            this.headText = <SVGTextElement>svg.child(this.g, "text", { x: 310, y: 100, class: "sim-text" })

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
            Runtime.messagePosted = (msg) => {
                switch (msg.type || '') {
                    case 'serial': this.flashSystemLed(); break;
                    case 'radiopacket': this.flashAntenna(); break;
                }
            }
            let tiltDecayer = 0;
            this.element.addEventListener(pointerEvents.move, (ev: MouseEvent) => {
                let state = this.board;
                if (!state.accelerometer.isActive) return;

                if (tiltDecayer) {
                    clearInterval(tiltDecayer);
                    tiltDecayer = 0;
                }

                let ax = (ev.clientX - this.element.clientWidth / 2) / (this.element.clientWidth / 3);
                let ay = (ev.clientY - this.element.clientHeight / 2) / (this.element.clientHeight / 3);

                let x = - Math.max(- 1023, Math.min(1023, Math.floor(ax * 1023)));
                let y = Math.max(- 1023, Math.min(1023, Math.floor(ay * 1023)));
                let z2 = 1023 * 1023 - x * x - y * y;
                let z = Math.floor((z2 > 0 ? -1 : 1) * Math.sqrt(Math.abs(z2)));

                state.accelerometer.update(x, y, z);
                this.updateTilt();
            }, false);
            this.element.addEventListener(pointerEvents.leave, (ev: MouseEvent) => {
                let state = this.board;
                if (!state.accelerometer.isActive) return;

                if (!tiltDecayer) {
                    tiltDecayer = setInterval(() => {
                        let accx = state.accelerometer.getX(MicroBitCoordinateSystem.RAW);
                        accx = Math.floor(Math.abs(accx) * 0.85) * (accx > 0 ? 1 : -1);
                        let accy = state.accelerometer.getY(MicroBitCoordinateSystem.RAW);
                        accy = Math.floor(Math.abs(accy) * 0.85) * (accy > 0 ? 1 : -1);
                        let accz = -Math.sqrt(Math.max(0, 1023 * 1023 - accx * accx - accy * accy));
                        if (Math.abs(accx) <= 24 && Math.abs(accy) <= 24) {
                            clearInterval(tiltDecayer);
                            tiltDecayer = 0;
                            accx = 0;
                            accy = 0;
                            accz = -1023;
                        }
                        state.accelerometer.update(accx, accy, accz);
                        this.updateTilt();
                    }, 50)
                }
            }, false);

            this.edgeConnectorSvg.attachEvents(pointerEvents, this.board.bus, this.board.edgeConnectorState, this.element);
            this.buttonPairSvg.attachEvents(pointerEvents, this.board.bus, this.board.buttonPairState, this.props.buttonPairTheme);
        }
    }
}