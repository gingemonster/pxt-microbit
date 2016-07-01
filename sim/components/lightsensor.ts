/// <reference path="../../node_modules/pxt-core/typings/bluebird/bluebird.d.ts"/>
/// <reference path="../../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../../libs/microbit/dal.d.ts"/>


namespace pxsim {
    export class LightSensorCmp {
        usesLightLevel = false;
        lightLevel = 128;
    }
}

namespace pxsim.micro_bit {
    export interface ILightSensorTheme {
        lightLevelOn?: string;
        lightLevelOff?: string;
    }
    export var defaultLightSensorTheme: ILightSensorTheme = {
        lightLevelOn: "yellow",
        lightLevelOff: "#555"
    }

    export class LightSensorSvg {
        private lightLevelButton: SVGCircleElement;
        private lightLevelGradient: SVGLinearGradientElement;
        private lightLevelText: SVGTextElement;

        //TODO(DZ): Parameterize stroke
        public style = `
.sim-light-level-button {
    stroke:#fff;
    stroke-width: 3px;
}`; 
        
        public updateTheme(theme: ILightSensorTheme) {
            svg.setGradientColors(this.lightLevelGradient, theme.lightLevelOn, theme.lightLevelOff);
        }

        public updateState(state: LightSensorCmp, g: SVGElement, element: SVGSVGElement, theme: ILightSensorTheme, defs: SVGDefsElement) {
            if (!state || !state.usesLightLevel) return;

            if (!this.lightLevelButton) {
                let gid = "gradient-light-level";
                this.lightLevelGradient = svg.linearGradient(defs, gid)
                let cy = 50;
                let r = 35;
                this.lightLevelButton = svg.child(g, "circle", {
                    cx: `50px`, cy: `${cy}px`, r: `${r}px`,
                    class: 'sim-light-level-button',
                    fill: `url(#${gid})`
                }) as SVGCircleElement;
                let pt = element.createSVGPoint();
                svg.buttonEvents(this.lightLevelButton,
                    (ev) => {
                        let pos = svg.cursorPoint(pt, element, ev);
                        let rs = r / 2;
                        let level = Math.max(0, Math.min(255, Math.floor((pos.y - (cy - rs)) / (2 * rs) * 255)));
                        if (level != state.lightLevel) {
                            state.lightLevel = level;
                            this.applyLightLevel(state);
                        }
                    }, ev => { },
                    ev => { })
                this.lightLevelText = svg.child(g, "text", { x: 85, y: cy + r - 5, text: '', class: 'sim-text' }) as SVGTextElement;
                this.updateTheme(theme);
            }

            svg.setGradientValue(this.lightLevelGradient, Math.min(100, Math.max(0, Math.floor(state.lightLevel * 100 / 255))) + '%')
            this.lightLevelText.textContent = state.lightLevel.toString();
        }

        private applyLightLevel(state: LightSensorCmp) {
            let lv = state.lightLevel;
            svg.setGradientValue(this.lightLevelGradient, Math.min(100, Math.max(0, Math.floor(lv * 100 / 255))) + '%')
            this.lightLevelText.textContent = lv.toString();
        }
    }
}

namespace pxsim.input {
    export function lightLevel(): number {
        let b = board().lightSensorCmp;
        if (!b.usesLightLevel) {
            b.usesLightLevel = true;
            runtime.queueDisplayUpdate();
        }
        return b.lightLevel;
    }
}