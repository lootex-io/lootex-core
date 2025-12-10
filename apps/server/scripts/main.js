require('dotenv').config({ path: './.env' });

const OpenSeaCrawlerService = require('./OpenSeaCrawlerService');

const crawler = new OpenSeaCrawlerService();


crawler.getRanks({ limit: 100 })
  .then(collections => {
  })
  .catch(error => {
    console.error('Error:', error);
  });