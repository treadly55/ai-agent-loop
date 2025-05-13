// src/tools.js

/**
 * Fetches events by calling our Netlify serverless function proxy.
 * @param {string} city - The city string (e.g., "Sydney, New South Wales, Australia").
 * @param {string} eventApiKeyString - The timeframe key (e.g., "date:today").
 * @param {string[]} [categories] - Optional, likely unused.
 * @returns {Promise<string>} Stringified JSON array of event objects or an error message.
 */
export async function getEvents(city, eventApiKeyString, categories = []) {
    console.log(`[Tool Called] getEvents (via Netlify Function): city='${city}', eventApiKeyString='${eventApiKeyString}'`);

    const params = new URLSearchParams();
    params.append('eventApiKeyString', eventApiKeyString);
    params.append('city', city); // Add city as a query parameter

    const functionUrl = `/.netlify/functions/get-events?${params.toString()}`;
    console.log(`[Tool Requesting] Netlify Function URL: ${functionUrl}`);

    const requestOptions = {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
    };

    try {
        const response = await fetch(functionUrl, requestOptions);
        const data = await response.json();

        console.log(`[Tool Response Status from Function] ${response.status} ${response.statusText}`);
        console.log("[Tool Response Data from Function]", data);

        if (!response.ok || data.error) {
            const errorMessage = data.error || `Function request failed with status ${response.status}`;
            console.error("[Tool Error from Netlify Function]", errorMessage);
            throw new Error(errorMessage);
        }
        return JSON.stringify(data);

    } catch (error) {
        console.error(`[Tool Error] Failed to fetch events via Netlify Function: ${error.message}`);
        return JSON.stringify({ error: `Failed to get events via proxy: ${error.message}` });
    }
}

export const availableFunctions = {
    getEvents
};
