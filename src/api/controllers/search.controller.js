const httpStatus = require('http-status');
const Scrapper = require('../models/search.model');

const search = new Scrapper();
/**
 * Load user and append to req.
 * @public
 */
exports.loadOlx = async (req, res, next) => {
  try {
    await search.launchPage();
    const offers = await search.searchOlx();
    res.status(httpStatus.OK);
    res.json(offers);
  } catch (error) {
    next(error);
  }
};
