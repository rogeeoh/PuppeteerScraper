const puppeteer = require('puppeteer');

const main = async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto('https://www.clien.net/service/', {waitUntil: 'networkidle2'});

    const articleElements = await page.$$('div.recommended div.list_title span.subject');

    for (const elem of articleElements) {
        const text = await elem.evaluate(node => node.innerText);
        console.log(text);
    }


    await browser.close();
};

main();