import BaseScraper from "../common/BaseScraper";
import puppeteer, {Browser, ElementHandle, Page} from 'puppeteer';
import {ScraperConfig, ScraperPropType} from "../common/types";
import ScraperSchema from "../common/elements";
import yamlVerifier from "../utils/yamlVerifier";

const config: ScraperConfig = {
    browser: {
        // 사용할 브라우저 모듈, puppeteer-extra 등이 사용될 수 있음
        module: puppeteer,
        // puppeteer launch options
        launch: {
            headless: false,
            defaultViewport: null,
            args: [
                '--window-size=1366,768',
                '--no-sandbox',
                '--disable-gpu',
                '--single-process',
                '--no-zygote',
            ],
        },
        // 브라우저 start 혹은 loop 전에 실행할 초기 작업(puppeteer-pending-xhr 등 설정)
        afterLaunch: async (browser, page) => {
            // do something after browser launched
            console.log('after Launch!');
        },
        beforeClose: async (browser, page) => {
            // do something before browser terminates
            console.log('before Terminate!')
        },
    },
    onCollecting: {
        title: async (props, event, element) => {
            const title = await event(props);
            console.log(title);
            return title;
        },
    },
    callback: {
        getLinkUrl: async ({page}) => page.url(),
        onTitleError: async (props: ScraperPropType) => {
            throw new Error('TitleError');
        },
    },
    // must return value or throw error?
    onUnhandledError: async (props, error) => {
        console.error(error);
        // throw new Error(error);
    },
    options: {
        // console.log 출력 여부
        debug: true,
        // 프로그램이 3600초 (1시간)이상 동작하면 강제 종료
        timeout: 60 * 60,
    },
};

let pageNumber: number = 0;
const scrapeSchema: ScraperSchema = yamlVerifier('./src/examples/schema1.yaml');

// https://www.clien.net/service/board/jirum?&od=T31&category=0&po=0
const scrape = async (browser: Browser, page: Page, {collect, stop, delay}: any): Promise<void> => {
    console.log(`Hello scrape start!`);
    await page.goto(`https://www.clien.net/service/board/jirum?&od=T31&category=0&po=${pageNumber}`, {waitUntil: "networkidle2"});
    await page.waitForTimeout(1000);
    let trs: ElementHandle[] = await page.$$('div.list_item.jirum');
    const trLength = trs.length;
    for (let i = 0; i < trLength; ++i) {
        trs = await page.$$('div.list_item.jirum');
        const tr: ElementHandle = trs[i];
        // const titleElement: ElementHandle | null = await tr.$('span.list_subject > a');
        // const title: string = await page.evaluate(elem => elem.textContent.trim(), titleElement);
        // console.log(title);
        let data = await collect(tr, 'main');
        console.log(data);
        // @ts-ignore
        // const subLink: ElementHandle = await tr.$('span.list_subject > a');
        // await subLink.click();
        // await delay(2000);
        // await Promise.race([
        //     page.waitForNavigation({waitUntil: "networkidle2"}),
        //     this._pendingXHR.waitForAllXhrFinished(),
        // ]);
    }
    pageNumber += 1;
    if (pageNumber === 3){
        stop({immediate: true});
        console.log('stop msg??');
    }
}

const scraper: BaseScraper = new BaseScraper(scrapeSchema, config);
scraper.start(scrape, {loop: true});