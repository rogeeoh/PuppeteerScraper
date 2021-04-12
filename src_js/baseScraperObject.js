const puppeteer = require('puppeteer');

const baseScraper = {
    _schema: undefined,
    _config: {
        browser: {
            module: puppeteer,
            launch: {
                headless: true,
                defaultViewport: null,
                args: [
                    '--window-size=1366,768',
                    '--no-sandbox',
                    '--disable-gpu',
                    '--single-process',
                    '--no-zygote',
                ],
            },
            afterLaunch: undefined,
            beforeClose: undefined,
        },
        onCollecting: {},
        callback: {},
        onUnhandledError: async (props, error) => {
            console.error(error);
        },
        options: {
            debug: false,
            timeout: 60 * 60
        }
    },
    _puppeteerAssets: {
        browser: undefined,
        page: undefined,
    },
    _status: {
        running: true
    },
};

module.exports = baseScraper;