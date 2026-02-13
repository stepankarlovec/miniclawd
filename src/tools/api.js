import { Tool } from './base.js';
import { z } from 'zod';
import axios from 'axios';

export class WeatherTool extends Tool {
    constructor() {
        super(
            'get_weather',
            'Get current weather for a location (latitude/longitude required). User should provide lat/lon or city name to be looked up first (but this tool only takes lat/lon for simplicity, standard is lat=52.52, lon=13.41 for Berlin).',
            z.object({
                latitude: z.number().describe('Latitude of the location'),
                longitude: z.number().describe('Longitude of the location'),
            })
        );
    }

    async execute({ latitude, longitude }) {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
            const response = await axios.get(url);
            return JSON.stringify(response.data.current_weather);
        } catch (error) {
            return `Error fetching weather: ${error.message}`;
        }
    }
}

export class CoinGeckoTool extends Tool {
    constructor() {
        super(
            'get_crypto_price',
            'Get the current price of a cryptocurrency (e.g., bitcoin, ethereum).',
            z.object({
                coinId: z.string().describe('The ID of the coin (e.g., "bitcoin")'),
                currency: z.string().default('usd').describe('Target currency (e.g., "usd", "eur")'),
            })
        );
    }

    async execute({ coinId, currency }) {
        try {
            const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${currency}`;
            const response = await axios.get(url);
            return JSON.stringify(response.data);
        } catch (error) {
            return `Error fetching crypto price: ${error.message}`;
        }
    }
}

export class RandomFactTool extends Tool {
    constructor() {
        super(
            'get_random_fact',
            'Get a random useless fact.',
            z.object({})
        );
    }

    async execute() {
        try {
            const response = await axios.get('https://uselessfacts.jsph.pl/api/v2/facts/random');
            return response.data.text;
        } catch (error) {
            return `Error fetching fact: ${error.message}`;
        }
    }
}
