// src/tools.js

// No longer need SerpApi key or base URL here

/**
 * Fetches events by calling our Netlify serverless function proxy.
 * @param {string} city - Expected to always be "Sydney" but passed for consistency.
 * @param {string} eventApiKeyString - The timeframe key (e.g., "date:today").
 * @param {string[]} [categories] - Optional, likely unused.
 * @returns {Promise<string>} Stringified JSON array of event objects or an error message.
 */
export async function getEvents(city, eventApiKeyString, categories = []) {
    console.log(`[Tool Called] getEvents (via Netlify Function): city=${city}, eventApiKeyString='${eventApiKeyString}'`);

    // Construct the URL to our Netlify function
    // Pass the event key as a query parameter
    const params = new URLSearchParams();
    params.append('eventApiKeyString', eventApiKeyString);
    // Note: We don't need to pass the city here if the function always assumes Sydney

    // The path to the Netlify function
    // If using redirects in netlify.toml (e.g., /api/events), use that path here.
    // Otherwise, use the default path:
    const functionUrl = `/.netlify/functions/get-events?${params.toString()}`;
    console.log(`[Tool Requesting] Netlify Function URL: ${functionUrl}`);

    // --- Make the API Call using Fetch to our OWN function endpoint ---
    const requestOptions = {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        }
    };

    try {
        // Fetch from our Netlify function URL
        const response = await fetch(functionUrl, requestOptions);
        const data = await response.json(); // Expecting JSON back from our function

        console.log(`[Tool Response Status from Function] ${response.status} ${response.statusText}`);
        console.log("[Tool Response Data from Function]", data);

        // Check if the function returned an error object within the JSON
        if (!response.ok || data.error) {
            const errorMessage = data.error || `Function request failed with status ${response.status}`;
            console.error("[Tool Error from Netlify Function]", errorMessage);
            throw new Error(errorMessage);
        }

        // The data should already be the processed array of events
        // Just need to stringify it for the AI agent
        return JSON.stringify(data);

    } catch (error) {
        console.error(`[Tool Error] Failed to fetch events via Netlify Function: ${error.message}`);
        // Return an error object in the JSON string
        return JSON.stringify({ error: `Failed to get events via proxy: ${error.message}` });
    }
}

// Export only the available function
export const availableFunctions = {
    getEvents
};
