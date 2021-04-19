import {
    ElementDataType,
    FromContextType,
    EvaluateElement,
    OnErrorPolicyType,
    ElementFromType,
    EvaluateType,
    OnErrorStrategyType, ScraperElementType, ElementObject, CollectObject
} from "./types";

export class ElementFrom {
    context: FromContextType;
    selector?: string;
    frameSelector?: string;
    waitForSelector?: string;
    xPath?: string;
    waitForXPath?: string;
    evaluate?: EvaluateType;
    // callback name
    name?: string;

    constructor(obj?: ElementFromType) {
        this.context = obj && obj.context || "Page";
        this.selector = obj && obj.selector;
        this.frameSelector = obj && obj.frameSelector;
        this.waitForSelector = obj && obj.waitForSelector;
        this.xPath = obj && obj.waitForXPath;
        this.waitForXPath = obj && obj.waitForXPath;
        this.evaluate = obj && obj.evaluate;
        this.name = obj && obj.name;
    }
}

// export class OnErrorStrategy {
//     policy: OnErrorPolicyType;
//     name?: string;
//     staticValue?: string;
//     type?: ElementType;
//     from?: ElementFrom;
//     isRequired: boolean;
//     isArray: boolean;
//
//     constructor(obj?: OnErrorStrategyType){
//         this.policy = obj && obj.policy || "Alternative";
//         this.name = obj && obj.name;
//         this.staticValue = obj && obj.staticValue;
//         this.type = obj && obj.type;
//         this.from = obj && obj.from;
//         this.isRequired = obj && obj.isRequired || true;
//         this.isArray = obj && obj.isArray || false;
//     }
// }


// export class ScraperElement {
//     type: ElementType;
//     isRequired: boolean;
//     isArray: boolean;
//     from?: ElementFrom;
//     onError?: OnErrorStrategy;
//     staticValue?: string;
//
//     constructor(obj: ScraperElementType){
//         this.type = obj.type;
//         this.isRequired = obj.isRequired || true;
//         this.isArray = obj.isArray || false;
//         this.from = obj.from;
//         this.onError = obj.onError || undefined;
//         this.staticValue = obj.staticValue;
//     }
// }

export default class ScraperSchema {
    elements: ElementObject;
    collect: CollectObject;
    etc: object | undefined;

    constructor(elements: ElementObject, collectList: CollectObject, etc?: object) {
        this.elements = elements;
        this.collect = collectList;
        this.etc = etc;
    }
}