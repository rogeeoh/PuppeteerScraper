const BaseScraper = require('../../../src_js/BaseScraper');
const yamlVerifier = require('../../../src_js/yamlVerifier');

const delay = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

const schema = yamlVerifier('./schema.yaml');
const scraper = BaseScraper(schema, {
    browser: {
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
    },
    callback: {},
});

const baseUrl = 'https://www.clien.net';
const resourcePath = '/service/board/jirum?&od=T31&po=';
const listSelector = '#div_content > div.list_content > div > div';

let pageNumber = 1;

scraper.start(async (browser, page, {collect, stop}) => {
    const url = `${baseUrl}${resourcePath}${pageNumber - 1}`;
    await page.goto(url, {waitUntil: 'networkidle2'});
    await page.waitForSelector(listSelector);
    await delay(1000);

    const list = await page.$$(listSelector);
    for (const item of list) {
        const data = await collect(item, 'main');
    }

    if (pageNumber === 3) {
        stop();
    }
    pageNumber += 1;
}, {loop: true});