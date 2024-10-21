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
    const items: Array<{ id: number, name: string, price: number, quantity: number, url: string, imageUrl: string }> = [];

    try {
        const browser = await puppeteer.launch({ headless: true });

        const pagePromises = Array.from({ length: 10 }, (_, i) => i + 1).map(async (pageNumber) => {
            const url = `https://steamcommunity.com/market/search?appid=730#p${pageNumber}_popular_desc`;
            const page = await browser.newPage();

            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            await page.goto(url, { waitUntil: 'networkidle2' });
            await page.waitForSelector('.market_listing_row');

            const content = await page.content();
            const $ = cheerio.load(content);

            $('.market_listing_row_link').each((i: number, element: cheerio.Element) => {
                const name = $(element).find('.market_listing_item_name').text().trim();
                const price = $(element).find('.sale_price').text().trim();
                const quantity = $(element).find('.market_listing_num_listings_qty').text().trim();
                const url = $(element).attr('href');
                const imageUrl = $(element).find('.market_listing_item_img').attr('src') ?? '';

                if (name && price && quantity && url) {
                    items.push({
                        id: items.length + 1, // Update the ID to be unique across pages
                        name,
                        price: parseFloat(price.replace('$', '').trim()),
                        quantity: parseInt(quantity.replace(',', '').trim()),
                        url,
                        imageUrl
                    });
                }
            });

            await page.close();
        });

        await Promise.all(pagePromises);

        await browser.close();

        res.json({ result: { assets: items } });
    } catch (error) {
        console.error('Error scraping Steam Market:', error);
        res.status(500).json({ error: 'Error fetching market items' });
    }
});

app.listen(5000, () => {
    console.log('Server running on port 5000');
});
