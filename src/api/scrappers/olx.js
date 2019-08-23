const puppeteer = require('puppeteer');
const moment = require('moment');

const defaultParams = {
  region: 'rzeszow',
  category: 'nieruchomosci',
  dealType: 'rent',
  priceMin: 500,
  priceMax: 5000,
  searchInDescription: true,
  offerProvider: 'private',
  descriptionOnly: false
};
const categories = ['motoryzacja', 'elektronika', 'rolnictwo', 'sport-hobby', 'dom-ogrod', 'moda', 'dla-dzieci', 'muzyka-edukacja', 'zwierzęta', 'nieruchomości', 'praca', 'usługi-firmy', 'slub-wesele'];
const dealTypes = ['rent', 'purchase'];

module.exports = class Scraper {
  constructor() {
    this.dateStamp = Date.now();
    this.browser = {};
    this.page = {};
  }

  async searchOlx(searchParams = defaultParams) {
    const convertOlxData = (dataString) => {
      if (dataString.includes('dzisiaj')) return moment().format('YYYY-MM-DD');
      if (dataString.includes('wczoraj')) return moment().subtract(1, 'days').format('YYYY-MM-DD');
      const [day, month] = dataString.split(' ');
      return `${moment().format('YYYY')}-${month}-${day}`;
    };
    const category = searchParams.category || 'oferty';
    const phrase = searchParams.phrase.replace(/\s/g, '-');
    const priceMin = searchParams.priceMin ? `search%5Bfilter_float_price%3Afrom%5D=${searchParams.priceMin}` : '';
    const priceMax = searchParams.priceMax ? `&search%5Bfilter_float_price%3Ato%5D=${searchParams.priceMax}` : '';
    const searchInDescription = searchParams.searchInDescription ? '&search%5Bdescription%5D=1' : '';
    const offerProvider = searchParams.offerProvider ? `&search%5Bprivate_business%5D=${searchParams.offerProvider}` : '';
    const order = searchParams.order ? `&search%5Border%5D=filter_float_price%3${searchParams.order}` : '';
    const OLX_URL = `https://www.olx.pl/${category}/q-${phrase}/?${priceMin}${priceMax}${searchInDescription}${offerProvider}${order}`;

    await this.page.goto(OLX_URL);
    if (searchParams.region) {
      await this.page.focus('#cityField');
      await this.page.keyboard.type(searchParams.region);
      await this.page.waitForSelector('#autosuggest-geo-ul .title');
      await this.page.keyboard.press('Enter');
      await new Promise((resolve => setTimeout(() => resolve(), 3000)));
    }
    await this.page.waitForSelector('.offer-wrapper a');
    await this.page.waitForSelector('.offer-wrapper img');
    let offers = await this.page.$$eval('.offer-wrapper', nodes => nodes
      .filter(element => !element.classList.value.includes('promoted'))
      .map(element => ({
        href: element.querySelector('a').getAttribute('href'),
        imgUrl: element.querySelector('img') && element.querySelector('img').getAttribute('src'),
        title: element.querySelector('strong').innerText,
        data: element.querySelector('i[data-icon="clock"]').parentElement.innerText
      })));
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
    };
  }

  async launchPage() {
    this.browser = await puppeteer.launch({ headless: false });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1024, height: 768 });
  }
};

