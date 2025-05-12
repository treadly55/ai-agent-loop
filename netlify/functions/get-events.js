// netlify/functions/get-events.js

// Use dynamic import for node-fetch v2/v3 compatibility in Netlify Functions
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Retrieve the SerpApi API key from Netlify environment variables
// IMPORTANT: Set this in your Netlify Site UI (Site settings > Build & deploy > Environment)
const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;
const SERPAPI_BASE_URL = "https://serpapi.com/search.json";

exports.handler = async (event, context) => {
    // event.queryStringParameters will contain parameters from the frontend request URL
    const { eventApiKeyString } = event.queryStringParameters;

    // Basic validation
    if (!eventApiKeyString) {
        return {
            statusCode: 400, // Bad Request
            body: JSON.stringify({ error: "Missing 'eventApiKeyString' query parameter." }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    if (!SERPAPI_API_KEY) {
        console.error("SerpApi API Key is missing in function environment.");
        return {
            statusCode: 500, // Internal Server Error
            body: JSON.stringify({ error: "Server configuration error: API Key missing." }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    // Construct the request to SerpApi
    const params = new URLSearchParams();
    params.append('engine', 'google_events');
    params.append('q', 'events');
    params.append('location', 'Sydney, New South Wales, Australia'); // Hardcoded Sydney
    params.append('gl', 'au');
    params.append('hl', 'en');
    params.append('htichips', eventApiKeyString); // Use the key passed from frontend
    params.append('api_key', SERPAPI_API_KEY); // Use the key from environment

    const requestUrl = `${SERPAPI_BASE_URL}?${params.toString()}`;
    console.log(`[Netlify Function] Requesting SerpApi URL: ${requestUrl}`);

    try {
        const response = await fetch(requestUrl);
        const data = await response.json();

        console.log(`[Netlify Function] SerpApi Response Status: ${response.status}`);

        // Check for SerpApi specific errors in the response body
        if (data.error) {
            console.error("[Netlify Function] Error from SerpApi:", data.error);
            // Return a specific error code if appropriate (e.g., 4xx for bad params, 5xx for SerpApi issues)
             return {
                statusCode: response.status === 400 ? 400 : 502, // Bad Gateway or Bad Request
                body: JSON.stringify({ error: `SerpApi Error: ${data.error}` }),
                headers: { 'Content-Type': 'application/json' },
            };
        }
        
        // Check if the expected data structure is present
        if (!data.events_results || !Array.isArray(data.events_results)) {
            console.warn("[Netlify Function] No 'events_results' array found in SerpApi response.");
             // Return success, but with empty data
             return {
                statusCode: 200,
                body: JSON.stringify([]), // Return empty array
                headers: { 'Content-Type': 'application/json' },
             };
        }

        // Process the successful response (same mapping logic as before)
        const processedEvents = data.events_results.map(event => ({
            id: event.link || `serpapi_${Math.random().toString(16).slice(2)}`,
            name: event.title || "Unnamed Event",
            description: event.description || "No description available.",
            date: event.date?.when || "Date unknown",
            location: event.address?.join(', ') || event.venue?.name || "Location unknown",
            category: event.knowledge_graph?.type || "Event"
        }));

        console.log("[Netlify Function] Processed events count:", processedEvents.length);

        // Return the processed data successfully to the frontend
        return {
            statusCode: 200,
            body: JSON.stringify(processedEvents),
            headers: {
                'Content-Type': 'application/json',
                // Optional: Add CORS headers if you ever need to call this function from
                // a *different* domain than the one Netlify serves your site on.
                // For same-origin calls (your Netlify site calling its own function),
                // these are usually not strictly necessary.
                // 'Access-Control-Allow-Origin': '*', // Or specify your site's origin
                // 'Access-Control-Allow-Headers': 'Content-Type',
                // 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            },
        };

    } catch (error) {
        console.error("[Netlify Function] Error fetching from SerpApi:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Failed to fetch events via proxy: ${error.message}` }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};
