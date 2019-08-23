const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const PAGE_URL = 'https://www.all-hashtag.com/hashtag-generator.php';
const JSON_DATA_DIR = path.join(process.cwd(), 'data');

class Scraper {
  constructor (url, targetDir) {
    this.url = url;
    this.targetDir = targetDir;
    this.data = [];
    this.dateStamp = Date.now()
  }

  _initDataDir () {
    if (!fs.existsSync(this.targetDir)) {
      fs.mkdirSync(this.targetDir)
    }
  }

  async run () {
    console.log(`>>> Started scraping the web at: ${new Date(this.dateStamp).toUTCString()}.`);

    // Run helper that creates pre-requisites
    void this._initDataDir();

    // Initialize puppeteer, with certain props
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.setViewport({ width: 1024, height: 768 });
    await page.goto(this.url);
    // Check what is the value for very first list element

    // Now look: we are waiting for elements values comparison!
    // await page.waitForFunction(`document.querySelectorAll('.JobSearchCard-item .JobSearchCard-primary-heading-link')[0].innerText !== "${previousFirstElementValue}"`)
    await page.waitForSelector('#keyword');
    await page.waitForSelector('#input-top');

    await page.click('label[for="input-top"]');
    await page.focus('#keyword');

    await page.keyboard.type('travel');
    await page.keyboard.press('Enter');

    await page.waitForSelector('#copy-hashtags');
    const hashtagsNode = await page.$('#copy-hashtags');
    const hashtags = await page.evaluate(el => el.innerText, hashtagsNode);
    // Loop over list of received projects

    const data = Object.assign({ scrapedAt: new Date(this.dateStamp).toUTCString() }, { scrapedData: this.data });
    const targetFile = path.join(JSON_DATA_DIR, `${this.dateStamp}.json`);

    // Use static method to write data in json format
    // Scraper.writeToFile(targetFile, data)

    const total = parseFloat((Date.now() - this.dateStamp) / 1000).toFixed(2);
    console.log(`>>> Done scraping the web at: ${new Date(this.dateStamp).toUTCString()}. It took ${total} seconds in total.`);

    // Exit with 0 code into sysout
    process.exit(0)
  }
}

Scraper.writeToFile = (targetFile, data) => {
  fs.writeFileSync(targetFile, JSON.stringify(data), 'utf-8')
};

Scraper.run = async (url, path) => {
  const scraper = new Scraper(PAGE_URL, path);
  void await scraper.run()
};

const main = async () => {
  try {
    await Scraper.run(PAGE_URL, JSON_DATA_DIR)
  } catch (e) {
    console.log(`Scrapping error: ${e.message}`)
  }
};

// Run main function
void main();
