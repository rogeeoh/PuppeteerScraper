const baseScraper = require('./baseScraperObject');

// delay
const delay = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

// initiate Browser
const initiateBrowser = async (puppeteerModule, puppeteerLaunchOption) => {
    return await puppeteerModule.launch(puppeteerLaunchOption);
};

// define start
baseScraper.start = async function (scrape, scrapeOption) {
    const defaultScrapeOption = {loop: false, delay: 1000};
    const option = {...defaultScrapeOption, ...scrapeOption};

    // 실제로 사용할 puppeteer 모듈
    const puppeteerModule = this._config.browser.module;
    const puppeteerLaunchOption = this._config.browser.launch;
    const browser = await initiateBrowser(puppeteerModule, puppeteerLaunchOption);
    // perform action after launching browser
    if (this._config.browser.afterLaunch) {
        try {
            await this._config.browser.afterLaunch();
        } catch (err) {
            console.error(err);
        }
    }

    // 반복되는 작업이라면
    if (option.loop === true) {
        while (this._status.running) {
            try {
                // page는 항상 0번째 겍체를 반환
                const page = (await browser.pages())[0];
                await scrape(browser, page, {collect, stop});
                await delay(option.delay);
            } catch (err) {
                // stop()에 의해 종료된 상황이 아니라면 에러 처리
                if (err.message !== 'STOP_IMMEDIATE') throw err;
                // stop에 의해 종료된 상황이라면 반복문 죵료
                break;
            } // end try
        } // end while
    } // end if
    // 반복되는 루프가 아니라면 한 번만 실행해주므로 keepRunning을 사용하지 않는다.
    else {
        const page = (await browser.pages())[0];
        await scrape(browser, page, {collect, stop});
    }

    // perform action before closing browser
    if (this._config.browser.beforeClose) {
        try {
            const page = (await browser.pages())[0];
            await this._config.browser.beforeClose(browser, page);
        }
        // beforeClose() error
        catch (err) {
            console.error(err);
        }
    }

    // close browser
    try {
        await browser.close();
    }
    // error closing browser
    catch (err) {
        console.error(err);
        process.exit(1);
    }
}; // end baseScraper.start

// .start에서 this를 쓰기 위해 binding 해준다
baseScraper.start.bind(baseScraper);

const validateType = async () => {

};

const matchContextType = async (from, context) => {
    const page = baseScraper._puppeteerAssets.page;
    switch (from.context) {
        case 'Context':
            return context;
        case 'Page':
            return page;
        case 'Frame':
            const frameElement = await page.$(from.frameSelector);
            return await frameElement.contentFrame();
        case 'Callback':
            return baseScraper._config.callback[from.name];
    }
};

// every schema must have schema.from in this function
const selectElement = async (schema, context) => {
    const page = baseScraper._puppeteerAssets.page;

    if (schema.from.waitForSelector) {
        // only if context has waitForSelector
        if (context.waitForSelector) await context.waitForSelector(schema.from.waitForSelector);
        else await page.waitForSelector(schema.from.waitForSelector);
    }

    if (schema.from.waitForXPath) {
        // only if context has waitForXPath
        if (context.waitForXPath) await context.waitForXPath(schema.from.waitForXPath);
        else await page.waitForXPath(schema.from.waitForXPath);
    }

    // use xpath or selector
    const elements = schema.from.selector
        ? await context.$$(schema.from.selector)
        : await context.$x(schema.from.xPath);

    if (schema.isArray) return elements;
    // if elements is empty, return null, same as puppeteer api
    else {
        if (elements.length === 0) return null;
        return elements[0];
    }
};

const collect = async (context, group) => {
    const collectData = {};
    // check if group exists in schema's collect
    if (!baseScraper._schema.collect[group]) {
        throw new Error(`UNDEFINED_GROUP_ERROR: ${group}`)
    }

    const browser = baseScraper._puppeteerAssets.browser;
    const page = baseScraper._puppeteerAssets.page;
    const collectElementNames = baseScraper._schema.collect[group];

    for (const elementName of collectElementNames) {
        const elementSchema = baseScraper._schema.elements[elementName];
        // set staticValue and continue
        if (elementSchema.staticValue) {
            collectData[elementName] = elementSchema.staticValue;
            continue;
        }

        // match context type
        const matchedContext = matchContextType(elementSchema.from, context);
        const props = {
            browser: browser,
            page: page,
            context: matchedContext,
            schema: {name: elementName, ...elementSchema},
        };

        // if matchedContext is callback, element should be undefined
        const elementHandle = typeof matchedContext === 'function'
            ? undefined
            : await selectElement(elementSchema, matchedContext);

        // if onCollecting element-override defined
        const onCollecting = baseScraper._config.onCollecting[elementName];

        // createDefaultEventFactory
        const defaultEvent = createDefaultEvent(elementSchema);

        try {
            collectData[elementName] = onCollecting
                ? await onCollecting(props, defaultEvent, elementHandle)
                : await defaultEvent(props);
        }
        // error
        catch (err) {
            console.error(err);
            let handleErrorSuccess = false;
            // onError handling if defined
            if (elementSchema.onError) {
                console.log(`try onError`);
                for (const handleError of elementSchema.onError) {
                    if (handleErrorSuccess) break;
                    try {
                        collectData[elementName] = await handleOnError(props, handleError);
                        handleErrorSuccess = true;
                    }
                    // onHandleErrorFail
                    catch (err) {
                        console.error(`handleError Failed: ${elementName}`);
                        console.error(err);
                    }
                }
            } // end if
            // onError not defined, onUnhandledError, must throw error
            if (!handleErrorSuccess) {
                try {
                    await baseScraper._config.onUnhandledError(props, err);
                }
                catch (err) {
                    console.error(err);
                }
                finally {
                    throw new Error(`UNHANDLED_ERROR: ${elementName}`);
                }
            }
        } // end try~catch
    } // end for

    return collectData;
};


const createDefaultEvent = async (elementSchema) => {
    // case Static
    if (elementSchema.staticValue) {
        return async (props) => {
            return props.schema.staticValue;
        };
    }
    // case Callback
    else if (elementSchema.from.context === 'Callback') {
        const callbackName = elementSchema.from.name;
        return baseScraper._config.callback[callbackName];
    }
    // case Context, Page, Frame
    else {
        return async (props) => {
            const {browser, page, context, schema} = props;
            // TODO: 완성하기
            switch(elementSchema.from.context){
                case 'Page':
                    break;
                case 'Frame':
                    break;
                case 'Context':
                    break;
            }
        };
    }
};

// TODO: 완성하기
const handleOnError = async (props, handleError) => {
    switch (handleError.policy) {
        case 'StaticValue':
            return handleError.staticValue;
        case 'Alternative':
            break;
        case 'Callback':
            break;
    }
};

const stop = (options) => {
    baseScraper._status.running = false;
    if (options && options.immediate) {
        // throw error to stop if immediate is true
        throw new Error('STOP_IMMEDIATE');
    }
};

const scraperInit = (schema, config) => {
    if (!schema) {
        throw new Error(`schema must be defined`)
    }
    baseScraper._schema = schema;
    // config가 있으면 적용을 해준다.
    if (config) {
        if (config.browser) {
            baseScraper._config.browser = {...baseScraper._config.browser, ...config.browser};
        }
        if (config.onCollecting) {
            baseScraper._config.onCollecting = {...baseScraper._config.onCollecting, ...config.onCollecting};
        }
        if (config.callback) {
            baseScraper._config.callback = {...baseScraper._config.callback, ...config.callback};
        }
        if (config.onUnhandledError) {
            baseScraper._config.onUnhandledError = config.onUnhandledError;
        }
        if (config.options) {
            baseScraper._config.options = {...baseScraper._config.options, ...config.options};
        }
    }

    return baseScraper;
};

module.exports = scraperInit;