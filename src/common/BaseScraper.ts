import puppeteer, {Browser, ElementHandle, Page} from 'puppeteer';
import ScraperSchema, {ElementFrom} from "./elements";
import {
    CollectDataType,
    CustomScraperConfig,
    OnCollectingTypeValue,
    OnErrorStrategyType,
    ScrapeOption,
    ScraperAsset,
    ScraperBrowserConfig,
    ScraperConfig,
    ScraperContextType,
    ScraperElementType,
    ScraperPropType,
    ScraperStatus
} from "./types";

/**
 * TODO:
 * 2) onError, callback 잘 도는지 확인
 * 3) xPath, waitForXPath 등도 잘 동작하는지 확인
 * 4) 데이터 타입이 의도한대로 들어갔는지 확인하는거 구현
 */


class BaseScraper {
    private schema: ScraperSchema;
    private config: ScraperConfig;
    private puppeteerAssets: ScraperAsset;
    private status: ScraperStatus;
    private stop: () => void;

    private createDefaultConfig(config: CustomScraperConfig): ScraperConfig {
        const defaultBrowser: ScraperBrowserConfig = {
            module: puppeteer,
            launch: {
                headless: process.env.NODE_ENV === "production",
                defaultViewport: null,
                args: [
                    '--window-size=1366,768',
                    '--no-sandbox',
                    '--disable-gpu',
                    '--single-process',
                    '--no-zygote',
                ],
            }
        };
        const defaultOnUnhandledError = async (props: ScraperPropType, error: any) => {
            console.error(error);
        };

        return {
            browser: {...defaultBrowser, ...config.browser} || defaultBrowser,
            onCollecting: config.onCollecting || {},
            callback: config.callback || {},
            onUnhandledError: config.onUnhandledError || defaultOnUnhandledError,
            options: config.options || undefined,
        };
    }

    constructor(schema: ScraperSchema, config: CustomScraperConfig) {
        this.schema = schema;
        this.config = this.createDefaultConfig(config);

        // @ts-ignore
        this.puppeteerAssets = {};
        this.status = {running: true};

        // 외부에서 쓰기 위해 binding
        this.stop = this.stopScraping.bind(this);
        this.collect = this.collect.bind(this);
        this.selectElement = this.selectElement.bind(this);
        this.delay = this.delay.bind(this);
    }

    private async initiateBrowser(browserConfig: ScraperBrowserConfig): Promise<any> {
        const browserModule: any = browserConfig.module;
        return await browserModule.launch(browserConfig.launch);
    }

    private async initiate(): Promise<void> {
        const browser: Browser = await this.initiateBrowser(this.config.browser);
        const page: Page = (await browser.pages())[0];
        this.puppeteerAssets = {browser, page};

        if (this.config.browser.afterLaunch) {
            await this.config.browser.afterLaunch(browser, page);
        }
    }

    private async terminate(): Promise<void> {
        const browser = this.puppeteerAssets.browser;
        // perform action before closing browser
        if (this.config.browser.beforeClose && browser) {
            try {
                const page = (await browser.pages())[0];
                await this.config.browser.beforeClose(browser, page);
            }
                // beforeClose() error
            catch (err) {
                console.error(err);
            }
        }

        // close browser
        try {
            // @ts-ignore
            await browser.close();
        }
            // error closing browser
        catch (err) {
            console.error(err);
            process.exit(1);
        }
    } // end terminate

    private async matchContextType(from: ElementFrom | undefined, context: ScraperContextType): Promise<ScraperContextType | undefined> {
        if (from === undefined)
            return undefined;

        const page = this.puppeteerAssets.page;
        switch (from.context) {
            case 'Context':
                return context;
            case 'Page':
                return page;
            case 'Frame':
                if (from.frameSelector != null) {
                    const frameElement = await page.$(from.frameSelector);
                    if (frameElement) {
                        const contentFrame = await frameElement.contentFrame();
                        if (contentFrame) return contentFrame;
                    }
                }
                return undefined;
            case 'Callback':
                if (from.name === undefined) {
                    throw new Error(`Callback name not defined`);
                }
                return this.config.callback[from.name];
        }
    }

    private async collect(context: ScraperContextType, group: string): Promise<CollectDataType> {
        const data: CollectDataType = {};
        // check if group exists in schema's collect
        if (!this.schema.collect[group]) {
            throw new Error(`UNDEFINED_GROUP_ERROR: ${group}`)
        }

        const collectElementNames: string[] = this.schema.collect[group];

        for (const elementName of collectElementNames) {
            const elementSchema: ScraperElementType = this.schema.elements[elementName];
            // set if staticValue
            if (elementSchema.staticValue) {
                data[elementName] = elementSchema.staticValue;
                continue;
            }

            // match context type
            const matchedContext: ScraperContextType | undefined = await this.matchContextType(elementSchema.from, context);

            let elementHandle: ElementHandle | ElementHandle[] | undefined;
            if (typeof matchedContext === 'function' || matchedContext === undefined) {
                elementHandle = undefined;
            } else {
                elementHandle = await this.selectElement(elementSchema, matchedContext);
            }

            const onCollecting: OnCollectingTypeValue | undefined = this.config.onCollecting[elementName];

            const props: ScraperPropType = {
                browser: this.puppeteerAssets.browser,
                page: this.puppeteerAssets.page,
                context: matchedContext,
                schema: elementSchema,
            };

            const defaultEvent = this.createDefaultEvent(elementSchema);

            try {
                data[elementName] = onCollecting
                    ? await onCollecting(props, defaultEvent, elementHandle)
                    : await defaultEvent(props);
            }
                // handle error
            catch (defaultEventError) {
                console.error(`defaultEvent or onCollecting Error: ${elementName}`);
                console.error(defaultEventError);
                let handleErrorSuccess: boolean = false;
                // if onError handling is defined
                if (elementSchema.onError && Array.isArray(elementSchema.onError)) {
                    console.log(`try onError`);
                    for (const handleError of elementSchema.onError) {
                        if (handleErrorSuccess) break;

                        try {
                            data[elementName] = await this.handleOnError(props, handleError);
                            handleErrorSuccess = true;
                        }
                            // onHandleErrorFail
                        catch (err) {
                            console.error(`handleError Failed: ${elementName}`);
                            console.error(err);
                        }
                    } // end for
                } // end if elementSchema.onError

                // if onError not defined, onUnhandledError must throw error
                if (!handleErrorSuccess) {
                    try {
                        // constructor creates default onunhandlederror
                        // @ts-ignore
                        await this.config.onUnhandledError(props, defaultEventError);
                    } catch (err) {
                        console.error(err);
                    } finally {
                        throw new Error(`UNHANDLED_ERROR: ${elementName}`);
                    }
                }
            } // end try ~ catch
        } // end for collectElementNames

        return data;
    } // end collectData


    private async handleOnError(props: ScraperPropType, handleError: OnErrorStrategyType): Promise<any | any[]> {
        switch (handleError.policy) {
            case "StaticValue":
                return handleError.staticValue;
            case "Alternative":
                // @ts-ignore
                const elemOrElems: ElementHandle | ElementHandle[] = await this.selectElement(handleError, props.context);
                if (Array.isArray(elemOrElems)) {
                    const resultTexts: string[] = [];
                    for (const elem of elemOrElems) {
                        // @ts-ignore
                        const text: string = await this.evaluateElement(elem, props.schema.from)
                        resultTexts.push(text);
                    }
                    return resultTexts;
                } else {
                    // @ts-ignore
                    return await this.evaluateElement(elemOrElems, props.schema.from)
                }
            case "Callback":
                // @ts-ignore
                const callback = this.config.callback[handleError.name];
                return await callback(props);
        }
    }

    private createDefaultEvent(elementSchema: ScraperElementType) {
        // case static
        if (elementSchema.staticValue) {
            return async (props: ScraperPropType) => props.schema.staticValue;
        }
        // case Callback
        else if (elementSchema.from?.context === 'Callback') {
            // @ts-ignore
            const callbackName: string = elementSchema.from.name;
            return this.config.callback[callbackName];
        }
        // case Context, Page, Frame
        else {
            return async (props: ScraperPropType): Promise<string | string[]> => {
                // @ts-ignore
                const elemOrElems: ElementHandle | ElementHandle[] = await this.selectElement(props.schema, props.context);
                // check if result is array
                if (Array.isArray(elemOrElems)) {
                    const resultTexts: string[] = [];
                    for (const elem of elemOrElems) {
                        // const text: string = await elem.evaluate(node => node.innerText);
                        // @ts-ignore
                        const text: string = await this.evaluateElement(elem, props.schema.from)
                        resultTexts.push(text);
                    }
                    return resultTexts;
                } else {
                    // return await elemOrElems.evaluate(node => node.innerText);
                    // @ts-ignore
                    return await this.evaluateElement(elemOrElems, props.schema.from)
                }
            };
        }
    } // end createDefaultEvent

    private async evaluateElement(element: ElementHandle, from: ElementFrom) {
        if (!from.evaluate || from.evaluate === "Text") {
            return await element.evaluate(node => node.innerText.trim());
        }

        if (from.evaluate === 'Html') {
            return await element.evaluate(node => node.outerHTML.trim());
        }

        if (from.evaluate.getAttribute) {
            return await element.evaluate((node, attr) => node.getAttribute(attr), from.evaluate.getAttribute);
            // 예외상황. text도 아니면서 getattribute도 아닌 케이스엔 여기로 빠짐
            // 언제든지 오류가 발생할 수 있는 상황임
        } else {
            const key: string = Object.keys(from.evaluate)[0];
            // @ts-ignore
            const value = from.evaluate[attributeKey];
            return await element.evaluate((node, {key, value}) => {
                return node[key](value);
            }, {key, value});
        }
    }

    private async selectElement(schema: ScraperElementType | OnErrorStrategyType, context: ScraperContextType): Promise<ElementHandle | ElementHandle[] | undefined> {
        const page = this.puppeteerAssets.page;

        // waitForSelector 확인
        if (schema.from?.waitForSelector) {
            if ('waitForSelector' in context)
                await context.waitForSelector(schema.from.waitForSelector);
            else
                await page.waitForSelector(schema.from.waitForSelector);
        }

        if (schema.from?.waitForXPath) {
            if ('waitForXPath' in context)
                await context.waitForXPath(schema.from.waitForXPath);
            else
                await page.waitForXPath(schema.from.waitForXPath);
        }


        let elements: ElementHandle[];

        if (schema.from?.selector && '$$' in context) {
            elements = await context.$$(schema.from.selector);
        } else if (schema.from?.xPath && '$x' in context) {
            elements = await context.$x(schema.from.xPath);
        } else {
            elements = [];
        }


        if (schema.isArray)
            return elements;
        else {
            if (elements.length === 0) return undefined;
            return elements[0];
        }

    }

    private stopScraping(options?: { immediate: boolean }): void {
        this.status.running = false;
        if (options && options.immediate) {
            throw new Error('STOP_IMMEDIATE');
        }
    }

    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public async start(scrape: (browser: Browser, page: Page, controllers: { stop: () => void, collect: () => Promise<object> }) => Promise<void>, option?: ScrapeOption): Promise<void> {
        try {
            await this.initiate();
            // set default option if not exist
            const defaultScrapeOption: ScrapeOption = {loop: false, delay: 1000};

            const scrapeOption: ScrapeOption = option
                ? {...defaultScrapeOption, ...option}
                // @ts-ignore
                : defaultScrapeOption;

            const {browser, page} = this.puppeteerAssets;
            const controllers = {collect: this.collect, stop: this.stop, delay: this.delay};

            if (scrapeOption.loop === true) {
                while (this.status.running) {
                    try {
                        // page는 항상 0번째 겍체를 반환
                        // @ts-ignore
                        await scrape(browser, page, controllers);
                        // @ts-ignore
                        await this.delay(scrapeOption.delay);
                    } catch (err) {
                        // stop()에 의해 종료된 상황이 아니라면 에러 처리
                        if (err.message !== 'STOP_IMMEDIATE') throw err;
                        // stop에 의해 종료된 상황이라면 반복문 죵료
                        break;
                    } // end try
                }
            } // ene if
            else {
                // @ts-ignore
                await scrape(browser, page, controllers);
            }
        } catch (err) {
            console.error(err);
        } finally {
            await this.terminate();
        }
    } // end start
} // end class BaseScraper


export default BaseScraper;