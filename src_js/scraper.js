const puppeteer = require('puppeteer');
const yamlVerifier = require('./yamlVerifier');
const BaseScraper = require('./BaseScraper.js');
const util = require("util");

const handleData = async (data) => {
    console.log(data);
};

const url = `https://www.clien.net/service/board/jirum`;

const schema = yamlVerifier('./schema.yaml');

const downloadFile = async (element) => {
    const fileName = await element.click();
    // 파일 다운 받는 상황을 가정
    await delay(1000);
    return fileName;
}

const config = {
    browser: {
        // 사용할 브라우저 모듈, puppeteer-extra 등이 사용될 수 있음
        module: puppeteer,
        // puppeteer launch options
        launch: {headless: false},
        // 브라우저 start 혹은 loop 전에 실행할 초기 작업(puppeteer-pending-xhr 등 설정)
        afterLaunch: async (browser, page) => {
            // do something after browser launched
        },
        beforeClose: async (browser, page) => {
            // do something before browser terminates
        },
    },
    onCollecting: {
        title: async (props, event, element) => {
            const title = await event(props);
            console.log(title);
            return title;
        },
        video_link: async (props, event, element) => {
            const src = await event(props);
            return `https://clien.net/videos/${src}`;
        },
        files: async (props, event, elements) => {
            const fileNames = [];
            for (const fileElement of elements) {
                // 파일 다운로드 시도
                try {
                    const fileName = await downloadFile(fileElement);
                    fileNames.push(fileName);
                }
                // 실패시 오류 출력
                catch (error){
                    console.error(error);
                }
            }
            return fileNames;
        },
    },
    callback: {
        getLinkUrl: ({page}) => page.url(),
        onContentError: async (props, error) => {
            console.error(error);
            // null을 리턴
            return null;
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

const crawler = BaseScraper(schema, config);
console.log(util.inspect(crawler, false, null, true));


// /**
//  * Case1: 반복이 되지 않는 경우는 loop: false로 세팅한다 (기본값)
//  */
// crawler.start(async (browser, page, {collect}) => {
//     await page.goto(url, {waitUntil: 'networkidle2'});
//     const mainList = await page.$('table > tr');
//     for (const main of mainList) {
//         try {
//             const data = await collect(page, 'main');
//             // 데이터 활용
//             await handleData(data);
//         }
//             // 여기에서 잡히는 catch는 yaml에 의해 handle되지 않은 오류.
//         catch (err) {
//             console.error(err);
//         }
//     }
// });
//
//
/**
 * Case2: 반복되지 않는 경우 loop를 사용한다
 * @type {number}
 */
let pageNumber = 1;
// start는 1회성, loop는 stop이 될 때까지 반복한다.
crawler.start(async (browser, page, {collect, stop}) => {
    await page.goto(`${url}?&od=T31&po=${pageNumber}`);
    const mainList = await page.$$('table > tr');
    for (const main of mainList) {
        try {
            const data = await collect(page, 'main');
            // 데이터 활용
            await handleData(data);
        }
            // 여기에서 잡히는 catch는 yaml에 의해 handle되지 않은 오류.
        catch (err) {
            console.error(err);
        }
    }
    pageNumber += 1;

    // 3 페이지라면 종료
    if (pageNumber === 3) {
        stop();
        // stop({immediate: true}); // 이렇게 하면 즉시 종료함
    }
}, {loop: true, delay: 1000});
// loop에 숫자가 들어가면 반복회수 (loop: 5 => 5회 반복)