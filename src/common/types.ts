import {ElementFrom} from "./elements";
import puppeteer, {Browser, ElementHandle, Frame, LaunchOptions, Page} from 'puppeteer';


export type FromContextType = "Page" | "Context" | "Frame" | "Callback";
export type EvaluateType = "textContent" | string;
// string or getAttribute or evaluate
export type EvaluateElement = "textContent" | ({getAttribute: string} | {evaluate: EvaluateType});
export type OnErrorPolicyType = "Alternative" | "Callback" | "StaticValue";
export type ElementDataType = "String" | "Match" | "Date" | "Number" | "Integer";
export type ElementObject = {[key: string]: ScraperElementType};
export type CollectObject = {[key: string]: string[]};
export type ScraperContextType = Page | Frame | ElementHandle | ((props: ScraperPropType, error?: any) => Promise<any | any[]>) | ((props: ScraperPropType, error?: any) => any | any[]);


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
export type OnErrorStrategyType = ({
    policy: OnErrorPolicyType,
    name?: string,
    staticValue?: string,
    type: ElementDataType,
    from: ElementFrom,
    isRequired?: boolean,
    isArray?: boolean,
} | {
    policy: "Callback",
    name: string,
    staticValue: never,
    type: never,
    from: never,
    isRequired?: boolean,
    isArray?: boolean,
});

// if staticValue exists, others are not needed
export type ScraperElementType = ({
    type: ElementDataType,
    from: ElementFrom,
    isRequired: boolean,
    isArray: boolean,
    onError: OnErrorStrategyType,
    staticValue: never,
} | {
    type: ElementDataType,
    staticValue: string,
    from?: never,
    isRequired?: never,
    isArray?: never,
    onError?: never,
});

export type ScraperBrowserConfig = {
    module: any;
    launch: LaunchOptions;
    afterLaunch?: (browser: Browser, page: Page) => Promise<void> | undefined;
    beforeClose?: (browser: Browser, page: Page) => Promise<void> | undefined;
};

export type ScraperPropType = {
    browser: Browser;
    page: Page;
    // elementhandle, frame, page, function
    context: ScraperContextType | undefined;
    schema: ScraperElementType;
};

export type ScraperConfig = {
    browser: ScraperBrowserConfig;
    onCollecting: OnCollectingType;
    callback: {[key: string]: (props: ScraperPropType) => Promise<any | any[]>};
    onUnhandledError: (props: ScraperPropType, error: any) => void,
    options: { debug: boolean, timeout: number};
};

export type OnCollectingType = {[key: string]: OnCollectingTypeValue};
export type OnCollectingTypeValue = (props: ScraperPropType, event: any, elements?: any | any[]) => Promise<any | any[]>;

export type ScraperAsset = {
    browser: Browser;
    page: Page;
};

export type ScraperStatus = {
    running: boolean;
};

export type ScrapeOption = {
    loop?: boolean;
    delay?: number;
}

export type CollectDataType = {
    [key: string]: any | any[];
}