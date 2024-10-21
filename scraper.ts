import express from 'express';
import puppeteer from 'puppeteer';
import cors from 'cors';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const app = express();

app.use(cors({
    origin: 'http://localhost:5173'
}));


app.get('/api/market/items', async (req: express.Request, res: express.Response) => {
  const url = `https://steamcommunity.com/market/search?appid=730#p1_popular_desc`;

  try {
    const browser = await puppeteer.launch({ headless: true });

    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    await page.goto(url, { waitUntil: 'networkidle2' });

    await page.waitForSelector('.market_listing_row');

    const content = await page.content();

    // fs.writeFileSync(path.join(process.cwd(), 'scraped_content.html'), content);

    await browser.close();

    const $ = cheerio.load(content);

    const items: Array<{ id: number, name: string, price: number, quantity: number, url: string, imageUrl: string }> = [];

    $('.market_listing_row_link').each((i: number, element: cheerio.Element) => {
      const name = $(element).find('.market_listing_item_name').text().trim();

      const price = $(element).find('.sale_price').text().trim();

      const quantity = $(element).find('.market_listing_num_listings_qty').text().trim();
      const url = $(element).attr('href');
      const imageUrl = $(element).find('.market_listing_item_img').attr('src') ?? '';

      if (name && price && quantity && url ) {
        items.push({
          id: i + 1, 
          name,
          price: parseFloat(price.replace('$', '').trim()), 
          quantity: parseInt(quantity.replace(',', '').trim()), 
          url,
          imageUrl
        });
      }
    });

    res.json({ result: { assets: items } });
  } catch (error) {
    console.error('Error scraping Steam Market:', error);
    res.status(500).json({ error: 'Error fetching market items' });
  }
});

app.listen(5000, () => {
  console.log('Server running on port 5000');
});
