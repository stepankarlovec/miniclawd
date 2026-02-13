import axios from 'axios';
import * as cheerio from 'cheerio';
import { htmlToText } from 'html-to-text';

// Helper to mimic browser headers
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

export const webTools = [
    {
        name: 'search_web',
        description: 'Search the internet using DuckDuckGo. Returns a list of results with titles, links, and snippets.',
        schema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'The search query'
                }
            },
            required: ['query']
        },
        func: async ({ query }) => {
            try {
                // Use DuckDuckGo HTML endpoint (no API key needed)
                const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
                const response = await axios.get(url, { headers: HEADERS });

                const $ = cheerio.load(response.data);
                const results = [];

                $('.result').each((i, el) => {
                    if (i >= 5) return false; // Limit to top 5 results

                    const title = $(el).find('.result__title').text().trim();
                    const link = $(el).find('.result__url').attr('href');
                    const snippet = $(el).find('.result__snippet').text().trim();

                    if (title && link) {
                        results.push({ title, link, snippet });
                    }
                });

                if (results.length === 0) {
                    return "No results found.";
                }

                return JSON.stringify(results, null, 2);
            } catch (error) {
                return `Error searching web: ${error.message}`;
            }
        }
    },
    {
        name: 'read_web_page',
        description: 'Read the content of a specific web page. Extracts text and returns the first 500 words.',
        schema: {
            type: 'object',
            properties: {
                url: {
                    type: 'string',
                    description: 'The URL to read'
                }
            },
            required: ['url']
        },
        func: async ({ url }) => {
            try {
                // Correctly resolve relative URLs if DDG gives us one
                if (url.startsWith('//')) url = 'https:' + url;

                const response = await axios.get(url, {
                    headers: HEADERS,
                    timeout: 10000 // 10s timeout
                });

                // Convert HTML to text
                const text = htmlToText(response.data, {
                    wordwrap: false,
                    ignoreHref: true,
                    ignoreImage: true
                });

                // Clean up extra whitespace
                const cleanText = text.replace(/\s+/g, ' ').trim();

                // Truncate to 500 words
                const words = cleanText.split(' ');
                const truncated = words.slice(0, 500).join(' ');

                const wordCount = words.length;
                const info = wordCount > 500 ? `[Truncated. Showing 500 of ${wordCount} words]` : `[Full Text - ${wordCount} words]`;

                return `${info}\n\n${truncated}`;
            } catch (error) {
                return `Error reading page: ${error.message}`;
            }
        }
    }
];
