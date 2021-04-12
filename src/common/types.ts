import {ElementFrom, OnErrorStrategy, ScraperElement} from "./elements";


export type FromContextType = "Page" | "Context" | "Frame" | "Callback";
export type EvaluateType = "textContent" | string;
// string or getAttribute or evaluate
export type EvaluateElement = "textContent" | ({getAttribute: string} | {evaluate: EvaluateType});
export type OnErrorPolicyType = "Alternative" | "Callback" | "StaticValue";
export type ElementType = "String" | "Match" | "Date" | "Number" | "Integer" | "Static";
export type ElementObject = {[key: string]: ScraperElement};
export type CollectObject = {[key: string]: string[]};

// selector, xPath, evaluate는 셋 중 하나만 들어올 수 있음
export type ElementFromType = ({
    context?: FromContextType,
    name: never,
    frameSelector?: string,
    waitForSelector?: string,
    waitForXPath?: string,
    selector: string,
    xPath?: never,
    evaluate?: never,
} | {
    context?: FromContextType,
    name: never,
    frameSelector?: string,
    waitForSelector?: string,
    waitForXPath?: string,
    selector?: never,
    xPath: string,
    evaluate?: never,
} | {
    context?: FromContextType,
    name: never,
    frameSelector?: string,
    waitForSelector?: string,
    waitForXPath?: string,
    selector?: never,
    xPath?: never,
    evaluate: EvaluateType,
} | {
    context: "Callback",
    name: string,
    selector?: never,
    xPath?: never,
    evaluate?: never,
    frameSelector?: never,
    waitForSelector?: never,
    waitForXPath?: never,
});

//
export type OnErrorStrategyType = {
    policy: OnErrorPolicyType,
    name?: string,
    staticValue?: string,
    type: ElementType,
    from: ElementFrom,
    isRequired?: boolean,
    isArray?: boolean,
};

// if staticValue exists, others are not needed
export type ScraperElementType = ({
    type: ElementType,
    from: ElementFrom,
    isRequired: boolean,
    isArray: boolean,
    onError: OnErrorStrategy,
    staticValue: never,
} | {
    type: ElementType,
    staticValue: string,
    from?: never,
    isRequired?: never,
    isArray?: never,
    onError?: never,
});


