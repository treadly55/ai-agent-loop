// src/tools.js

/**
 * Fetches events by calling our Netlify serverless function proxy for events.
 * @param {string} city - The city string (e.g., "Sydney, New South Wales, Australia").
 * @param {string} eventApiKeyString - The timeframe key (e.g., "date:today").
 * @param {string[]} [categories] - Optional, likely unused.
 * @returns {Promise<string>} Stringified JSON array of event objects or an error message.
 */
export async function getEvents(city, eventApiKeyString, categories = []) {
    console.log(`[Tool Called] getEvents (via Netlify Function): city='${city}', eventApiKeyString='${eventApiKeyString}'`);

    const params = new URLSearchParams();
    params.append('eventApiKeyString', eventApiKeyString);
    params.append('city', city);

    const functionUrl = `/.netlify/functions/get-events?${params.toString()}`;
    console.log(`[Tool Requesting] Netlify Function URL for Events: ${functionUrl}`);

    const requestOptions = {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
    };

    try {
        const response = await fetch(functionUrl, requestOptions);
        const data = await response.json();

        console.log(`[Tool Response Status from get-events Function] ${response.status} ${response.statusText}`);
        console.log("[Tool Response Data from get-events Function]", data);

        if (!response.ok || data.error) {
            const errorMessage = data.error || `Events function request failed with status ${response.status}`;
            console.error("[Tool Error from get-events Function]", errorMessage);
            throw new Error(errorMessage);
        }
        return JSON.stringify(data);

    } catch (error) {
        console.error(`[Tool Error] Failed to fetch events via Netlify Function: ${error.message}`);
        return JSON.stringify({ error: `Failed to get events via proxy: ${error.message}` });
    }
}

/**
 * Fetches weather by calling our Netlify serverless function proxy for weather.
 * @param {string} cityFullName - The city string (e.g., "Sydney, New South Wales, Australia").
 * @param {string} date - The specific date for the weather forecast (YYYY-MM-DD).
 * @returns {Promise<string>} Stringified JSON object of the weather forecast or an error message.
 */
export async function getWeather(cityFullName, date) {
    console.log(`[Tool Called] getWeather (via Netlify Function): cityFullName='${cityFullName}', date='${date}'`);

    const params = new URLSearchParams();
    params.append('cityFullName', cityFullName);
    params.append('date', date);

    const functionUrl = `/.netlify/functions/get-weather?${params.toString()}`;
    console.log(`[Tool Requesting] Netlify Function URL for Weather: ${functionUrl}`);

    const requestOptions = {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
    };

    try {
        const response = await fetch(functionUrl, requestOptions);
        const data = await response.json();

        console.log(`[Tool Response Status from get-weather Function] ${response.status} ${response.statusText}`);
        console.log("[Tool Response Data from get-weather Function]", data);

        if (!response.ok || data.error) {
            const errorMessage = data.error || `Weather function request failed with status ${response.status}`;
            console.error("[Tool Error from get-weather Function]", errorMessage);
            throw new Error(errorMessage);
        }
        return JSON.stringify(data);

    } catch (error) {
        console.error(`[Tool Error] Failed to fetch weather via Netlify Function: ${error.message}`);
        return JSON.stringify({ error: `Failed to get weather via proxy: ${error.message}` });
    }
}

// Export both available functions
export const availableFunctions = {
    getEvents,
    getWeather // Add getWeather here
};
