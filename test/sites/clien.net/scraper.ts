import BaseScraper from "../../../src/common/BaseScraper";
import puppeteer, {Browser, ElementHandle, Page} from 'puppeteer';
import {CustomScraperConfig, ScraperPropType} from "../../../src/common/types";
import ScraperSchema from "../../../src/common/elements";
import yamlVerifier from "../../../src/utils/yamlVerifier";
import {PendingXHR} from "pending-xhr-puppeteer";

let pendingXHR: PendingXHR;
const config: CustomScraperConfig = {
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
            pendingXHR = new PendingXHR(page);
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
        onDateError: async (props: ScraperPropType) => {
            return 'UnknownDate';
        },
    },
    // returns void
    onUnhandledError: async (props, error) => {
        console.error(`unhandlederror`);
    },
    // TODO: 미완성
    // options: {
    //     // console.log 출력 여부
    //     debug: true,
    //     // 프로그램이 3600초 (1시간)이상 동작하면 강제 종료
    //     timeout: 60 * 60,
    // },
};

let pageNumber: number = 0;
const scrapeSchema: ScraperSchema = yamlVerifier('./test/sites/clien.net/schema.yaml');

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
        const trData = await collect(tr, 'main');

        // @ts-ignore
        const linkElem: ElementHandle = await tr.$('span.list_subject > a');
        await linkElem.click();
        await Promise.all([
            delay(500),
            pendingXHR.waitForAllXhrFinished(),
        ]);

        const subData = await collect(page, 'sub');
        const data = {...trData, ...subData};

        console.log(data);
        await page.goto(`https://www.clien.net/service/board/jirum?&od=T31&category=0&po=${pageNumber}`, {waitUntil: "networkidle2"});
    }
    pageNumber += 1;
    if (pageNumber === 3){
        stop({immediate: true});
        console.log('stop msg??');
    }
}

const scraper: BaseScraper = new BaseScraper(scrapeSchema, config);
scraper.start(scrape, {loop: true});