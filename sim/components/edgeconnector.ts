/// <reference path="../../node_modules/pxt-core/typings/bluebird/bluebird.d.ts"/>
/// <reference path="../../node_modules/pxt-core/built/pxtsim.d.ts"/>
/// <reference path="../../libs/microbit/dal.d.ts"/>

namespace pxsim.input {
    //todo   
}

namespace pxsim.micro_bit {
    export interface IEdgeConnectorTheme {
        //todo
    }

    export var defaultEdgeConnectorTheme: IEdgeConnectorTheme = {
        //todo
    };

    export class EdgeConnectorSvg {
        //todo
        public style = ` `;

        public updateTheme(edgeConnectorTheme: IEdgeConnectorTheme) {
            //todo
        }

        public updateState(g: SVGElement, state: EdgeConnectorState, edgeConnectorTheme: IEdgeConnectorTheme) {
            //todo
        }

        public buildDom(g: SVGElement) {
            //todo
        }
        
        public attachEvents(pointerEvents: IPointerEvents, bus: EventBus, state: EdgeConnectorState, edgeConnectorTheme: IEdgeConnectorTheme) {
            //todo
        }
    }
}

namespace pxsim {

    export class EdgeConnectorState {
        //todo

        constructor() {
            //todo
        }
    }
}