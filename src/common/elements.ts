import {
    ElementDataType,
    FromContextType,
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