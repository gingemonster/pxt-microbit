/// <reference path="../../node_modules/pxt-core/typings/bluebird/bluebird.d.ts"/>
/// <reference path="../../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../../libs/microbit/dal.d.ts"/>

namespace pxsim.input {
    export function onButtonPressed(button: number, handler: RefAction): void {
        let b = board();
        if (button == DAL.MICROBIT_ID_BUTTON_AB && !board().usesButtonAB) {
            b.usesButtonAB = true;
            runtime.queueDisplayUpdate();
        }
        pxt.registerWithDal(button, DAL.MICROBIT_BUTTON_EVT_CLICK, handler);
    }

    export function buttonIsPressed(button: number): boolean {
        let b = board();
        if (button == DAL.MICROBIT_ID_BUTTON_AB && !board().usesButtonAB) {
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
}