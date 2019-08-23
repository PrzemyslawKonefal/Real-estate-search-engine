const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')
const moment = require('moment')

const PAGE_URL = 'https://www.instagram.com/'
const JSON_DATA_DIR = path.join(process.cwd(), 'searches')
const searchParams = {
  region: 'rzeszow',
  category: 'nieruchomosci',
  dealType: 'rent'
  priceMin: 500,
  priceMax: 5000,
  searchInDescription: true,
  offerProvider: 'private',
  descriptionOnly: false
}
const categories = ['motoryzacja', 'elektronika', 'rolnictwo', 'sport-hobby', 'dom-ogrod', 'moda', 'dla-dzieci', 'muzyka-edukacja', 'zwierzęta', 'nieruchomości', 'praca', 'usługi-firmy', 'slub-wesele'];
const dealTypes = ['rent', 'purchase']
class Scraper {
  constructor (url, targetDir) {
    this.url = url
    this.targetDir = targetDir
    this.data = []
    this.dateStamp = Date.now()
    this.browser = {}
    this.page = {}
  }

  async searchOlx(searchParams) {
    const convertOlxData = (dataString) => {
      if (dataString.includes('dzisiaj')) return moment().format('YYYY-MM-DD');
      if (dataString.includes('wczoraj')) return moment().subtract(1, 'days').format('YYYY-MM-DD');
      const [day, month] = dataString.split(' ');
      return `${moment().format('YYYY')}-${month}-${day}`
    };
    const category = searchParams.category || 'oferty';
    const phrase = searchParams.phrase.replace(/\s/g, '-');
    const priceMin = searchParams.priceMin ? `search%5Bfilter_float_price%3Afrom%5D=${searchParams.priceMin}` : '';
    const priceMax = searchParams.priceMax ? `&search%5Bfilter_float_price%3Ato%5D=${searchParams.priceMax}` : '';
    const searchInDescription = searchParams.searchInDescription ? `&search%5Bdescription%5D=1` : '';
    const offerProvider = searchParams.offerProvider ? `&search%5Bprivate_business%5D=${searchParams.offerProvider}` : '';
    const order = searchParams.order ? `&search%5Border%5D=filter_float_price%3${searchParams.order}` : '';
    const OLX_URL = `https://www.olx.pl/${category}/q-${phrase}/?${priceMin}${priceMax}${searchInDescription}${offerProvider}${order}`;

    await this.page.goto(OLX_URL)
    if (searchParams.region) {
      await this.page.focus('#cityField');
      await this.page.keyboard.type(searchParams.region)
      await this.page.waitForSelector('#autosuggest-geo-ul .title');
      await this.page.keyboard.press('Enter')
      await new Promise((resolve => setTimeout(() => resolve(), 3000)))
    }
    await this.page.waitForSelector('.offer-wrapper a')
    await this.page.waitForSelector('.offer-wrapper img')
    let offers = await this.page.$$eval('.offer-wrapper', (nodes) => {
      return nodes
        .filter(element => !element.classList.value.includes('promoted'))
        .map(element => ({
          href: element.querySelector('a').getAttribute('href'),
          imgUrl: element.querySelector('img') && element.querySelector('img').getAttribute('src'),
          title: element.querySelector('strong').innerText,
          data: element.querySelector('i[data-icon="clock"]').parentElement.innerText
        }))
    });
      offers = offers.map(offer => ({
        ...offer,
        data: convertOlxData(offer.data)
      }));
    return {
      id: `${OLX_URL.replace('https://www.olx.pl', 'olx').replace(/\//g, '-').replace(/[?]/g, '')}-${searchParams.region}`,
      timestamp: this.dateStamp,
      offers: searchParams.descriptionOnly
        ? offers.filter(offer => !offer.title.toLowerCase().includes(searchParams.phrase.toLowerCase()))
        : offers
    }
  }

  async run () {
    this.browser = await puppeteer.launch({ headless: false });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1024, height: 768 })
    const newOffers =  await this.searchOlx(searchParams);
    const targetFile = path.join(this.targetDir, `${newOffers.id}.json`)
    if (!fs.existsSync(targetFile)) {
      Scraper.writeToFile(targetFile, newOffers)
    }
  }
}

Scraper.writeToFile = (targetFile, data) => {
  fs.writeFileSync(targetFile, JSON.stringify(data), 'utf-8')
}

Scraper.run = async (url, path) => {
  const scraper = new Scraper(PAGE_URL, path)
  void await scraper.run()
}

const main = async () => {
  try {
    await Scraper.run(PAGE_URL, JSON_DATA_DIR)
  } catch (e) {
    console.log(`Scrapping error: ${e.message}`)
  }
}

// Run main function
void main()

