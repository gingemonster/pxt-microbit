/// <reference path="../../node_modules/pxt-core/typings/bluebird/bluebird.d.ts"/>
/// <reference path="../../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../../libs/microbit/dal.d.ts"/>

namespace pxsim.input {
    export function onButtonPressed(button: number, handler: RefAction): void {
        let b = board().buttonPairState;
        if (button == DAL.MICROBIT_ID_BUTTON_AB && !b.usesButtonAB) {
            b.usesButtonAB = true;
            runtime.queueDisplayUpdate();
        }
        pxt.registerWithDal(button, DAL.MICROBIT_BUTTON_EVT_CLICK, handler);
    }

    export function buttonIsPressed(button: number): boolean {
        let b = board().buttonPairState;
        if (button == DAL.MICROBIT_ID_BUTTON_AB && !b.usesButtonAB) {
            b.usesButtonAB = true;
            runtime.queueDisplayUpdate();
        }
        let bts = b.buttons;
        if (button == DAL.MICROBIT_ID_BUTTON_A) return bts[0].pressed;
        if (button == DAL.MICROBIT_ID_BUTTON_B) return bts[1].pressed;
        return bts[2].pressed || (bts[0].pressed && bts[1].pressed);
    }
}

namespace pxsim.micro_bit {
    export interface IButtonPairTheme {
        buttonOuter?: string;
        buttonUp?: string;
        buttonDown?: string;
        virtualButtonOuter?: string;
        virtualButtonUp?: string;
        virtualButtonDown?: string;
    }

    export var defaultButtonPairTheme: IButtonPairTheme = {
        buttonOuter: "#979797",
        buttonUp: "#000",
        buttonDown: "#FFA500",
        virtualButtonOuter: "#333",
        virtualButtonUp: "#fff",
    };

    export class ButtonPairSvg {
        private buttons: SVGElement[];
        private buttonsOuter: SVGElement[];
        private buttonABText: SVGTextElement;
        public style = `
.sim-button {
    pointer-events: none;    
}
.sim-button-outer:hover {
    stroke:grey;
    stroke-width: 3px;
}
.sim-button-nut {
    fill:#704A4A;
    pointer-events:none;
}
.sim-button-nut:hover {
    stroke:1px solid #704A4A; 
}
            `;

        public updateTheme(buttonPairTheme: IButtonPairTheme) {
            svg.fills(this.buttonsOuter.slice(0, 2), buttonPairTheme.buttonOuter);
            svg.fills(this.buttons.slice(0, 2), buttonPairTheme.buttonUp);
            svg.fill(this.buttonsOuter[2], buttonPairTheme.virtualButtonOuter);
            svg.fill(this.buttons[2], buttonPairTheme.virtualButtonUp);
        }

        public updateState(g: SVGElement, state: ButtonPairState, buttonPairTheme: IButtonPairTheme) {
            state.buttons.forEach((btn, index) => {
                svg.fill(this.buttons[index], btn.pressed ? buttonPairTheme.buttonDown : buttonPairTheme.buttonUp);
            });

            this.updateButtonAB(g, state, buttonPairTheme);
        }

        private updateButtonAB(g: SVGElement, state: ButtonPairState, buttonPairTheme: IButtonPairTheme) {
            if (state.usesButtonAB && !this.buttonABText) {
                (<any>this.buttonsOuter[2]).style.visibility = "visible";
                (<any>this.buttons[2]).style.visibility = "visible";
                this.buttonABText = svg.child(g, "text", { class: "sim-text", x: 370, y: 272 }) as SVGTextElement;
                this.buttonABText.textContent = "A+B";
                this.updateTheme(buttonPairTheme);
            }
        }

        public buildDom(g: SVGElement) {
            //TODO(DZ): Parameterize location
            this.buttonsOuter = []; this.buttons = [];

            const outerBtn = (left: number, top: number) => {
                const btnr = 4;
                const btnw = 56.2;
                const btnn = 6;
                const btnnm = 10
                let btng = svg.child(g, "g");
                this.buttonsOuter.push(btng);
                svg.child(btng, "rect", { class: "sim-button-outer", x: left, y: top, rx: btnr, ry: btnr, width: btnw, height: btnw });
                svg.child(btng, "circle", { class: "sim-button-nut", cx: left + btnnm, cy: top + btnnm, r: btnn });
                svg.child(btng, "circle", { class: "sim-button-nut", cx: left + btnnm, cy: top + btnw - btnnm, r: btnn });
                svg.child(btng, "circle", { class: "sim-button-nut", cx: left + btnw - btnnm, cy: top + btnw - btnnm, r: btnn });
                svg.child(btng, "circle", { class: "sim-button-nut", cx: left + btnw - btnnm, cy: top + btnnm, r: btnn });
            }

            outerBtn(25.9, 176.4);
            this.buttons.push(svg.path(g, "sim-button", "M69.7,203.5c0,8.7-7,15.7-15.7,15.7s-15.7-7-15.7-15.7c0-8.7,7-15.7,15.7-15.7S69.7,194.9,69.7,203.5"));
            outerBtn(418.1, 176.4);
            this.buttons.push(svg.path(g, "sim-button", "M461.9,203.5c0,8.7-7,15.7-15.7,15.7c-8.7,0-15.7-7-15.7-15.7c0-8.7,7-15.7,15.7-15.7C454.9,187.8,461.9,194.9,461.9,203.5"));
            outerBtn(417, 250);
            this.buttons.push(svg.child(g, "circle", { class: "sim-button", cx: 446, cy: 278, r: 16.5 }));
            (<any>this.buttonsOuter[2]).style.visibility = "hidden";
            (<any>this.buttons[2]).style.visibility = "hidden";
        }
        
        public attachEvents(pointerEvents: IPointerEvents, bus: EventBus, state: ButtonPairState, buttonPairTheme: IButtonPairTheme) {
            this.buttonsOuter.slice(0, 2).forEach((btn, index) => {
                btn.addEventListener(pointerEvents.down, ev => {
                    state.buttons[index].pressed = true;
                    svg.fill(this.buttons[index], buttonPairTheme.buttonDown);
                })
                btn.addEventListener(pointerEvents.leave, ev => {
                    state.buttons[index].pressed = false;
                    svg.fill(this.buttons[index], buttonPairTheme.buttonUp);
                })
                btn.addEventListener(pointerEvents.up, ev => {
                    state.buttons[index].pressed = false;
                    svg.fill(this.buttons[index], buttonPairTheme.buttonUp);

                    bus.queue(state.buttons[index].id, DAL.MICROBIT_BUTTON_EVT_CLICK);
                })
            })
            this.buttonsOuter[2].addEventListener(pointerEvents.down, ev => {
                state.buttons[0].pressed = true;
                state.buttons[1].pressed = true;
                state.buttons[2].pressed = true;
                svg.fill(this.buttons[0], buttonPairTheme.buttonDown);
                svg.fill(this.buttons[1], buttonPairTheme.buttonDown);
                svg.fill(this.buttons[2], buttonPairTheme.buttonDown);
            })
            this.buttonsOuter[2].addEventListener(pointerEvents.leave, ev => {
                state.buttons[0].pressed = false;
                state.buttons[1].pressed = false;
                state.buttons[2].pressed = false;
                svg.fill(this.buttons[0], buttonPairTheme.buttonUp);
                svg.fill(this.buttons[1], buttonPairTheme.buttonUp);
                svg.fill(this.buttons[2], buttonPairTheme.virtualButtonUp);
            })
            this.buttonsOuter[2].addEventListener(pointerEvents.up, ev => {
                state.buttons[0].pressed = false;
                state.buttons[1].pressed = false;
                state.buttons[2].pressed = false;
                svg.fill(this.buttons[0], buttonPairTheme.buttonUp);
                svg.fill(this.buttons[1], buttonPairTheme.buttonUp);
                svg.fill(this.buttons[2], buttonPairTheme.virtualButtonUp);

                bus.queue(state.buttons[2].id, DAL.MICROBIT_BUTTON_EVT_CLICK);
            })
        }
    }
}

namespace pxsim {
    export class Button {
        constructor(public id: number) { }
        pressed: boolean;
    }

    export class ButtonPairState {
        usesButtonAB: boolean = false;
        buttons: Button[];

        constructor() {
            this.buttons = [
                new Button(DAL.MICROBIT_ID_BUTTON_A),
                new Button(DAL.MICROBIT_ID_BUTTON_B),
                new Button(DAL.MICROBIT_ID_BUTTON_AB)
            ];
        }
    }
}