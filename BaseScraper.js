const baseScraper = {
    start: async function (scrape) {
        await scrape(this.browser, this.page);
    },
};

baseScraper.start.bind(baseScraper)

const scraperInit = (options) => {
    baseScraper.browser = 'browser';
    baseScraper.page = 'page';
    baseScraper.options = options;

    return baseScraper;
};

module.exports = scraperInit;