/**
 * Fetches events by calling our Netlify serverless function proxy for events.
 * @param {string} city - The city string (e.g., "Sydney, New South Wales, Australia").
 * @param {string} eventApiKeyString - The timeframe key (e.g., "date:today").
 * @param {string[]} [categories] - Optional, likely unused.
 * @returns {Promise<string>} Stringified JSON array of event objects or an error message.
 */
export async function getEvents(city, eventApiKeyString, categories = []) {
    const params = new URLSearchParams();
    params.append('eventApiKeyString', eventApiKeyString);
    params.append('city', city);

    const functionUrl = `/.netlify/functions/get-events?${params.toString()}`;

    const requestOptions = {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
    };

    try {
        const response = await fetch(functionUrl, requestOptions);

        if (!response.ok) {
            let errorDetails = `Events function request failed with status ${response.status} (${response.statusText})`;
            try {
                const textResponse = await response.text();
                errorDetails += ` - Server response: ${textResponse}`;
            } catch (textError) {
                // Failed to get text response, stick with status
            }
            console.error("[Tool Error from get-events Function]", errorDetails);
            throw new Error(errorDetails);
        }

        const data = await response.json();

        if (data.error) { // Check for application-level errors if JSON parsing was successful
            const errorMessage = data.error;
            console.error("[Tool Error from get-events Function]", errorMessage);
            throw new Error(errorMessage);
        }
        return JSON.stringify(data);

    } catch (error) {
        const finalErrorMessage = error.message || "Failed to get events via proxy";
        console.error(`[Tool Error] Failed to fetch events via Netlify Function: ${finalErrorMessage}`);
        // Return a stringified JSON object with the error message
        return JSON.stringify({ error: `Failed to get events via proxy: ${finalErrorMessage}` });
    }
}

/**
 * Fetches weather by calling our Netlify serverless function proxy for weather.
 * @param {string} cityFullName - The city string (e.g., "Sydney, New South Wales, Australia").
 * @param {string} date - The specific date for the weather forecast (YYYY-MM-DD).
 * @returns {Promise<string>} Stringified JSON object of the weather forecast or an error message.
 */
export async function getWeather(cityFullName, date) {
    const params = new URLSearchParams();
    params.append('cityFullName', cityFullName);
    params.append('date', date);

    const functionUrl = `/.netlify/functions/get-weather?${params.toString()}`;

    const requestOptions = {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
    };

    try {
        const response = await fetch(functionUrl, requestOptions);

        if (!response.ok) {
            let errorDetails = `Weather function request failed with status ${response.status} (${response.statusText})`;
            try {
                const textResponse = await response.text();
                errorDetails += ` - Server response: ${textResponse}`;
            } catch (textError) {
                // Failed to get text response, stick with status
            }
            console.error("[Tool Error from get-weather Function]", errorDetails);
            throw new Error(errorDetails);
        }

        const data = await response.json();

        if (data.error) { // Check for application-level errors if JSON parsing was successful
            const errorMessage = data.error;
            console.error("[Tool Error from get-weather Function]", errorMessage);
            throw new Error(errorMessage);
        }
        return JSON.stringify(data);

    } catch (error) {
        const finalErrorMessage = error.message || "Failed to get weather via proxy";
        console.error(`[Tool Error] Failed to fetch weather via Netlify Function: ${finalErrorMessage}`);
        // Return a stringified JSON object with the error message
        return JSON.stringify({ error: `Failed to get weather via proxy: ${finalErrorMessage}` });
    }
}

export const availableFunctions = {
    getEvents,
    getWeather
};
