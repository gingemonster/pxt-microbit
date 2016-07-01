/// <reference path="../../node_modules/pxt-core/typings/bluebird/bluebird.d.ts"/>
/// <reference path="../../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../../libs/microbit/dal.d.ts"/>


namespace pxsim {
    export class ThermometerCmp {
        usesTemperature = false;
        temperature = 21;

    }
}

namespace pxsim.micro_bit {
    export interface IThermometerTheme {
        foreground: string,
        background: string
    }
    export var defaultThermometerTheme: IThermometerTheme = {
        foreground: "#ff7f7f",
        background: "#202020"
    }

    export class ThermometerSvg {
        private thermometerGradient: SVGLinearGradientElement;
        private thermometer: SVGRectElement;
        private thermometerText: SVGTextElement;

        //TODO(DZ): parameterize stroke
        public style = `
.sim-thermometer {
    stroke:#aaa;
    stroke-width: 3px;
}`;
        
        public updateTheme(theme: IThermometerTheme) {
            svg.setGradientColors(this.thermometerGradient, theme.background, theme.foreground);
        }

        public updateState(state: ThermometerCmp, g: SVGElement, element: SVGSVGElement, theme: IThermometerTheme, defs: SVGDefsElement) {
            if (!state || !state.usesTemperature) return;

            let tmin = -5;
            let tmax = 50;
            if (!this.thermometer) {
                let gid = "gradient-thermometer";
                this.thermometerGradient = svg.linearGradient(defs, gid);
                this.thermometer = <SVGRectElement>svg.child(g, "rect", {
                    class: "sim-thermometer",
                    x: 120,
                    y: 110,
                    width: 20,
                    height: 160,
                    rx: 5, ry: 5,
                    fill: `url(#${gid})`
                });
                this.thermometerText = svg.child(g, "text", { class: 'sim-text', x: 58, y: 130 }) as SVGTextElement;
                this.updateTheme(theme);

                let pt = element.createSVGPoint();
                svg.buttonEvents(this.thermometer,
                    (ev) => {
                        let cur = svg.cursorPoint(pt, element, ev);
                        let t = Math.max(0, Math.min(1, (260 - cur.y) / 140))
                        state.temperature = Math.floor(tmin + t * (tmax - tmin));
                        this.updateState(state, g, element, theme, defs);
                    }, ev => { }, ev => { })
            }

            let t = Math.max(tmin, Math.min(tmax, state.temperature))
            let per = Math.floor((state.temperature - tmin) / (tmax - tmin) * 100)
            svg.setGradientValue(this.thermometerGradient, 100 - per + "%");
            this.thermometerText.textContent = t + "°C";
        }
    }
}

namespace pxsim.input {
    export function temperature(): number {
        let b = board();
        if (!b.thermometerCmp.usesTemperature) {
            b.thermometerCmp.usesTemperature = true;
            runtime.queueDisplayUpdate();
        }
        return b.thermometerCmp.temperature;
    }
}