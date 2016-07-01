namespace pxsim.boardsvg {
    export interface IPointerEvents {
        up: string,
        down: string,
        move: string,
        leave: string
    }

    export const pointerEvents: IPointerEvents = !!(window as any).PointerEvent ? {
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
}