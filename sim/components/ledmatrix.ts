/// <reference path="../../node_modules/pxt-core/typings/bluebird/bluebird.d.ts"/>
/// <reference path="../../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../../libs/microbit/dal.d.ts"/>

namespace pxsim {
    export enum DisplayMode {
        bw,
        greyscale
    }

    export class LedMatrixCmp {
        image = createImage(5);
        brigthness = 255;
        displayMode = DisplayMode.bw;
        font: Image = createFont();

        animationQ: AnimationQueue;

        constructor(runtime: Runtime) {
            this.animationQ = new AnimationQueue(runtime);
        }
    }

    export class Image {
        public static height: number = 5;
        public width: number;
        public data: number[];
        constructor(width: number, data: number[]) {
            this.width = width;
            this.data = data;
        }
        public get(x: number, y: number): number {
            if (x < 0 || x >= this.width || y < 0 || y >= 5) return 0;
            return this.data[y * this.width + x];
        }
        public set(x: number, y: number, v: number) {
            if (x < 0 || x >= this.width || y < 0 || y >= 5) return;
            this.data[y * this.width + x] = Math.max(0, Math.min(255, v));
        }
        public copyTo(xSrcIndex: number, length: number, target: Image, xTargetIndex: number): void {
            for (let x = 0; x < length; x++) {
                for (let y = 0; y < 5; y++) {
                    let value = this.get(xSrcIndex + x, y);
                    target.set(xTargetIndex + x, y, value);
                }
            }
        }
        public shiftLeft(cols: number) {
            for (let x = 0; x < this.width; ++x)
                for (let y = 0; y < 5; ++y)
                    this.set(x, y, x < this.width - cols ? this.get(x + cols, y) : 0);
        }

        public shiftRight(cols: number) {
            for (let x = this.width - 1; x <= 0; --x)
                for (let y = 0; y < 5; ++y)
                    this.set(x, y, x > cols ? this.get(x - cols, y) : 0);
        }

        public clear(): void {
            for (let i = 0; i < this.data.length; ++i)
                this.data[i] = 0;
        }
    }

    export function createImage(width: number): Image {
        return new Image(width, new Array(width * 5));
    }

    export function createImageFromBuffer(data: number[]): Image {
        return new Image(data.length / 5, data);
    }

    export function createImageFromString(text: string): Image {
        let font = board().displayCmp.font;
        let w = font.width;
        let sprite = createImage(6 * text.length - 1);
        let k = 0;
        for (let i = 0; i < text.length; i++) {
            let charCode = text.charCodeAt(i);
            let charStart = (charCode - 32) * 5;
            if (charStart < 0 || charStart + 5 > w) {
                charCode = " ".charCodeAt(0);
                charStart = (charCode - 32) * 5;
            }

            font.copyTo(charStart, 5, sprite, k);
            k = k + 5;
            if (i < text.length - 1) {
                k = k + 1;
            }
        }
        return sprite;
    }

    export function createFont(): Image {
        const data = [0x0, 0x0, 0x0, 0x0, 0x0, 0x8, 0x8, 0x8, 0x0, 0x8, 0xa, 0x4a, 0x40, 0x0, 0x0, 0xa, 0x5f, 0xea, 0x5f, 0xea, 0xe, 0xd9, 0x2e, 0xd3, 0x6e, 0x19, 0x32, 0x44, 0x89, 0x33, 0xc, 0x92, 0x4c, 0x92, 0x4d, 0x8, 0x8, 0x0, 0x0, 0x0, 0x4, 0x88, 0x8, 0x8, 0x4, 0x8, 0x4, 0x84, 0x84, 0x88, 0x0, 0xa, 0x44, 0x8a, 0x40, 0x0, 0x4, 0x8e, 0xc4, 0x80, 0x0, 0x0, 0x0, 0x4, 0x88, 0x0, 0x0, 0xe, 0xc0, 0x0, 0x0, 0x0, 0x0, 0x8, 0x0, 0x1, 0x22, 0x44, 0x88, 0x10, 0xc, 0x92, 0x52, 0x52, 0x4c, 0x4, 0x8c, 0x84, 0x84, 0x8e, 0x1c, 0x82, 0x4c, 0x90, 0x1e, 0x1e, 0xc2, 0x44, 0x92, 0x4c, 0x6, 0xca, 0x52, 0x5f, 0xe2, 0x1f, 0xf0, 0x1e, 0xc1, 0x3e, 0x2, 0x44, 0x8e, 0xd1, 0x2e, 0x1f, 0xe2, 0x44, 0x88, 0x10, 0xe, 0xd1, 0x2e, 0xd1, 0x2e, 0xe, 0xd1, 0x2e, 0xc4, 0x88, 0x0, 0x8, 0x0, 0x8, 0x0, 0x0, 0x4, 0x80, 0x4, 0x88, 0x2, 0x44, 0x88, 0x4, 0x82, 0x0, 0xe, 0xc0, 0xe, 0xc0, 0x8, 0x4, 0x82, 0x44, 0x88, 0xe, 0xd1, 0x26, 0xc0, 0x4, 0xe, 0xd1, 0x35, 0xb3, 0x6c, 0xc, 0x92, 0x5e, 0xd2, 0x52, 0x1c, 0x92, 0x5c, 0x92, 0x5c, 0xe, 0xd0, 0x10, 0x10, 0xe, 0x1c, 0x92, 0x52, 0x52, 0x5c, 0x1e, 0xd0, 0x1c, 0x90, 0x1e, 0x1e, 0xd0, 0x1c, 0x90, 0x10, 0xe, 0xd0, 0x13, 0x71, 0x2e, 0x12, 0x52, 0x5e, 0xd2, 0x52, 0x1c, 0x88, 0x8, 0x8, 0x1c, 0x1f, 0xe2, 0x42, 0x52, 0x4c, 0x12, 0x54, 0x98, 0x14, 0x92, 0x10, 0x10, 0x10, 0x10, 0x1e, 0x11, 0x3b, 0x75, 0xb1, 0x31, 0x11, 0x39, 0x35, 0xb3, 0x71, 0xc, 0x92, 0x52, 0x52, 0x4c, 0x1c, 0x92, 0x5c, 0x90, 0x10, 0xc, 0x92, 0x52, 0x4c, 0x86, 0x1c, 0x92, 0x5c, 0x92, 0x51, 0xe, 0xd0, 0xc, 0x82, 0x5c, 0x1f, 0xe4, 0x84, 0x84, 0x84, 0x12, 0x52, 0x52, 0x52, 0x4c, 0x11, 0x31, 0x31, 0x2a, 0x44, 0x11, 0x31, 0x35, 0xbb, 0x71, 0x12, 0x52, 0x4c, 0x92, 0x52, 0x11, 0x2a, 0x44, 0x84, 0x84, 0x1e, 0xc4, 0x88, 0x10, 0x1e, 0xe, 0xc8, 0x8, 0x8, 0xe, 0x10, 0x8, 0x4, 0x82, 0x41, 0xe, 0xc2, 0x42, 0x42, 0x4e, 0x4, 0x8a, 0x40, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x1f, 0x8, 0x4, 0x80, 0x0, 0x0, 0x0, 0xe, 0xd2, 0x52, 0x4f, 0x10, 0x10, 0x1c, 0x92, 0x5c, 0x0, 0xe, 0xd0, 0x10, 0xe, 0x2, 0x42, 0x4e, 0xd2, 0x4e, 0xc, 0x92, 0x5c, 0x90, 0xe, 0x6, 0xc8, 0x1c, 0x88, 0x8, 0xe, 0xd2, 0x4e, 0xc2, 0x4c, 0x10, 0x10, 0x1c, 0x92, 0x52, 0x8, 0x0, 0x8, 0x8, 0x8, 0x2, 0x40, 0x2, 0x42, 0x4c, 0x10, 0x14, 0x98, 0x14, 0x92, 0x8, 0x8, 0x8, 0x8, 0x6, 0x0, 0x1b, 0x75, 0xb1, 0x31, 0x0, 0x1c, 0x92, 0x52, 0x52, 0x0, 0xc, 0x92, 0x52, 0x4c, 0x0, 0x1c, 0x92, 0x5c, 0x90, 0x0, 0xe, 0xd2, 0x4e, 0xc2, 0x0, 0xe, 0xd0, 0x10, 0x10, 0x0, 0x6, 0xc8, 0x4, 0x98, 0x8, 0x8, 0xe, 0xc8, 0x7, 0x0, 0x12, 0x52, 0x52, 0x4f, 0x0, 0x11, 0x31, 0x2a, 0x44, 0x0, 0x11, 0x31, 0x35, 0xbb, 0x0, 0x12, 0x4c, 0x8c, 0x92, 0x0, 0x11, 0x2a, 0x44, 0x98, 0x0, 0x1e, 0xc4, 0x88, 0x1e, 0x6, 0xc4, 0x8c, 0x84, 0x86, 0x8, 0x8, 0x8, 0x8, 0x8, 0x18, 0x8, 0xc, 0x88, 0x18, 0x0, 0x0, 0xc, 0x83, 0x60];

        let nb = data.length;
        let n = nb / 5;
        let font = createImage(nb);
        for (let c = 0; c < n; c++) {
            for (let row = 0; row < 5; row++) {
                let char = data[c * 5 + row];
                for (let col = 0; col < 5; col++) {
                    if ((char & (1 << col)) != 0)
                        font.set((c * 5 + 4) - col, row, 255);
                }
            }
        }
        return font;
    }

    export interface AnimationOptions {
        interval: number;
        // false means last frame
        frame: () => boolean;
        whenDone?: (cancelled: boolean) => void;
    }

    export class AnimationQueue {
        private queue: AnimationOptions[] = [];
        private process: () => void;

        constructor(private runtime: Runtime) {
            this.process = () => {
                let top = this.queue[0]
                if (!top) return
                if (this.runtime.dead) return
                runtime = this.runtime
                let res = top.frame()
                runtime.queueDisplayUpdate()
                runtime.maybeUpdateDisplay()
                if (res === false) {
                    this.queue.shift();
                    // if there is already something in the queue, start processing
                    if (this.queue[0])
                        setTimeout(this.process, this.queue[0].interval)
                    // this may push additional stuff 
                    top.whenDone(false);
                } else {
                    setTimeout(this.process, top.interval)
                }
            }
        }

        public cancelAll() {
            let q = this.queue
            this.queue = []
            for (let a of q) {
                a.whenDone(true)
            }
        }

        public cancelCurrent() {
            let top = this.queue[0]
            if (top) {
                this.queue.shift();
                top.whenDone(true);
            }
        }

        public enqueue(anim: AnimationOptions) {
            if (!anim.whenDone) anim.whenDone = () => { };
            this.queue.push(anim)
            // we start processing when the queue goes from 0 to 1
            if (this.queue.length == 1)
                this.process()
        }

        public executeAsync(anim: AnimationOptions) {
            U.assert(!anim.whenDone)
            return new Promise<boolean>((resolve, reject) => {
                anim.whenDone = resolve
                this.enqueue(anim)
            })
        }
    }
}

namespace pxsim.micro_bit {
    export interface ILedMatrixTheme {
        display?: string;
        ledOn?: string;
        ledOff?: string;
    }
    export var defaultLedMatrixTheme = {
        display: "#000",
        ledOn: "#ff7f7f",
        ledOff: "#202020",
    };

    export class LedMatrixSvg {
        private display: SVGElement;
        private ledsOuter: SVGElement[];
        private leds: SVGElement[];

        public style = `
.sim-led-back:hover {
    stroke:#a0a0a0;
    stroke-width:3px;
}
.sim-led:hover {
    stroke:#ff7f7f;
    stroke-width:3px;
}
`;

        public updateTheme(theme: ILedMatrixTheme) {
            svg.fill(this.display, theme.display);
            svg.fills(this.leds, theme.ledOn);
            svg.fills(this.ledsOuter, theme.ledOff);
        }

        public updateState(state: LedMatrixCmp) {
            let bw = state.displayMode == pxsim.DisplayMode.bw
            let img = state.image;
            this.leds.forEach((led, i) => {
                let sel = (<SVGStylable><any>led)
                sel.style.opacity = ((bw ? img.data[i] > 0 ? 255 : 0 : img.data[i]) / 255.0) + "";
            })
        }

        public buildDom(g: SVGElement) {
            this.display = svg.path(g, "sim-display", "M333.8,310.3H165.9c-8.3,0-15-6.7-15-15V127.5c0-8.3,6.7-15,15-15h167.8c8.3,0,15,6.7,15,15v167.8C348.8,303.6,342.1,310.3,333.8,310.3z");

            // leds
            this.leds = [];
            this.ledsOuter = [];
            let left = 154, top = 113, ledoffw = 46, ledoffh = 44;
            for (let i = 0; i < 5; ++i) {
                let ledtop = i * ledoffh + top;
                for (let j = 0; j < 5; ++j) {
                    let ledleft = j * ledoffw + left;
                    let k = i * 5 + j;
                    this.ledsOuter.push(svg.child(g, "rect", { class: "sim-led-back", x: ledleft, y: ledtop, width: 10, height: 20, rx: 2, ry: 2 }));
                    this.leds.push(svg.child(g, "rect", { class: "sim-led", x: ledleft - 2, y: ledtop - 2, width: 14, height: 24, rx: 3, ry: 3, title: `(${j},${i})` }));
                }
            }
        }
    }
}

namespace pxsim.images {
    export function createImage(img: Image) { return img }
    export function createBigImage(img: Image) { return img }
}

namespace pxsim.ImageMethods {
    export function showImage(leds: Image, offset: number) {
        if (!leds) panic(PanicCode.MICROBIT_NULL_DEREFERENCE);

        leds.copyTo(offset, 5, board().displayCmp.image, 0)
        runtime.queueDisplayUpdate()
    }

    export function plotImage(leds: Image, offset: number): void {
        if (!leds) panic(PanicCode.MICROBIT_NULL_DEREFERENCE);

        leds.copyTo(offset, 5, board().displayCmp.image, 0)
        runtime.queueDisplayUpdate()
    }

    export function height(leds: Image): number {
        if (!leds) panic(PanicCode.MICROBIT_NULL_DEREFERENCE);
        return Image.height;
    }

    export function width(leds: Image): number {
        if (!leds) panic(PanicCode.MICROBIT_NULL_DEREFERENCE);
        return leds.width;
    }

    export function plotFrame(leds: Image, frame: number) {
        ImageMethods.plotImage(leds, frame * Image.height);
    }

    export function showFrame(leds: Image, frame: number) {
        ImageMethods.showImage(leds, frame * Image.height);
    }

    export function pixel(leds: Image, x: number, y: number): number {
        if (!leds) panic(PanicCode.MICROBIT_NULL_DEREFERENCE);
        return leds.get(x, y);
    }

    export function setPixel(leds: Image, x: number, y: number, v: number) {
        if (!leds) panic(PanicCode.MICROBIT_NULL_DEREFERENCE);
        leds.set(x, y, v);
    }

    export function clear(leds: Image) {
        if (!leds) panic(PanicCode.MICROBIT_NULL_DEREFERENCE);

        leds.clear();
    }

    export function setPixelBrightness(i: Image, x: number, y: number, b: number) {
        if (!i) panic(PanicCode.MICROBIT_NULL_DEREFERENCE);

        i.set(x, y, b);
    }

    export function pixelBrightness(i: Image, x: number, y: number): number {
        if (!i) panic(PanicCode.MICROBIT_NULL_DEREFERENCE);

        return i.get(x, y);
    }

    export function scrollImage(leds: Image, stride: number, interval: number): void {
        if (!leds) panic(PanicCode.MICROBIT_NULL_DEREFERENCE);
        if (stride == 0) stride = 1;

        let cb = getResume();
        let off = stride > 0 ? 0 : leds.width - 1;
        let display = board().displayCmp.image;

        board().displayCmp.animationQ.enqueue({
            interval: interval,
            frame: () => {
                if (off >= leds.width || off < 0) return false;
                stride > 0 ? display.shiftLeft(stride) : display.shiftRight(-stride);
                let c = Math.min(stride, leds.width - off);
                leds.copyTo(off, c, display, 5 - stride)
                off += stride;
                return true;
            },
            whenDone: cb
        })
    }
}

namespace pxsim.basic {
    export function showNumber(x: number, interval: number) {
        if (interval < 0) return;

        let leds = createImageFromString(x.toString());
        if (x < 0 || x >= 10) ImageMethods.scrollImage(leds, 1, interval);
        else showLeds(leds, interval * 5);
    }

    export function showString(s: string, interval: number) {
        if (interval < 0) return;
        if (s.length == 0) {
            clearScreen();
            pause(interval * 5);
        } else {
            if (s.length == 1) showLeds(createImageFromString(s), interval * 5)
            else ImageMethods.scrollImage(createImageFromString(s + " "), 1, interval);
        }
    }

    export function showLeds(leds: Image, delay: number): void {
        showAnimation(leds, delay);
    }

    export function clearScreen() {
        board().displayCmp.image.clear();
        runtime.queueDisplayUpdate()
    }

    export function showAnimation(leds: Image, interval: number): void {
        ImageMethods.scrollImage(leds, 5, interval);
    }

    export function plotLeds(leds: Image): void {
        ImageMethods.plotImage(leds, 0);
    }
}

namespace pxsim.led {
    export function plot(x: number, y: number) {
        board().displayCmp.image.set(x, y, 255);
        runtime.queueDisplayUpdate()
    }

    export function unplot(x: number, y: number) {
        board().displayCmp.image.set(x, y, 0);
        runtime.queueDisplayUpdate()
    }

    export function point(x: number, y: number): boolean {
        return !!board().displayCmp.image.get(x, y);
    }

    export function brightness(): number {
        return board().displayCmp.brigthness;
    }

    export function setBrightness(value: number): void {
        board().displayCmp.brigthness = value;
        runtime.queueDisplayUpdate()
    }

    export function stopAnimation(): void {
        board().displayCmp.animationQ.cancelAll();
    }

    export function setDisplayMode(mode: DisplayMode): void {
        board().displayCmp.displayMode = mode;
        runtime.queueDisplayUpdate()
    }

    export function screenshot(): Image {
        let img = createImage(5)
        board().displayCmp.image.copyTo(0, 5, img, 0);
        return img;
    }
}