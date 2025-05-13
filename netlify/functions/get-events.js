// netlify/functions/get-events.js

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;
const SERPAPI_BASE_URL = "https://serpapi.com/search.json";

exports.handler = async (event, context) => {
    const { eventApiKeyString } = event.queryStringParameters;

    if (!eventApiKeyString) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing 'eventApiKeyString' query parameter." }), headers: { 'Content-Type': 'application/json' } };
    }
    if (!SERPAPI_API_KEY) {
        console.error("SerpApi API Key is missing in function environment.");
        return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error: API Key missing." }), headers: { 'Content-Type': 'application/json' } };
    }

    const params = new URLSearchParams();
    params.append('engine', 'google_events');
    params.append('q', 'events');
    params.append('location', 'Sydney, New South Wales, Australia');
    params.append('gl', 'au');
    params.append('hl', 'en');
    params.append('htichips', eventApiKeyString);
    params.append('api_key', SERPAPI_API_KEY);

    const requestUrl = `${SERPAPI_BASE_URL}?${params.toString()}`;
    console.log(`[Netlify Function] Requesting SerpApi URL: ${requestUrl}`);

    try {
        const response = await fetch(requestUrl);
        const data = await response.json();
        console.log(`[Netlify Function] SerpApi Response Status: ${response.status}`);

        if (data.error) {
            console.error("[Netlify Function] Error from SerpApi:", data.error);
            return { statusCode: response.status === 400 ? 400 : 502, body: JSON.stringify({ error: `SerpApi Error: ${data.error}` }), headers: { 'Content-Type': 'application/json' } };
        }
        if (!data.events_results || !Array.isArray(data.events_results)) {
            console.warn("[Netlify Function] No 'events_results' array found in SerpApi response.");
            return { statusCode: 200, body: JSON.stringify([]), headers: { 'Content-Type': 'application/json' } };
        }

        // --- Process the successful response - INCLUDING THE LINK ---
        const processedEvents = data.events_results.map(event => ({
            // Use a more robust ID source if link isn't always present or unique enough
            id: event.link || event.event_location_map?.link || `serpapi_${Math.random().toString(16).slice(2)}`,
            name: event.title || "Unnamed Event",
            description: event.description || "No description available.",
            date: event.date?.when || "Date unknown",
            location: event.address?.join(', ') || event.venue?.name || "Location unknown",
            category: event.knowledge_graph?.type || "Event",
            // *** ADD THE LINK FIELD ***
            link: event.link || event.event_location_map?.link || null // Store the link URL, fallback to map link or null
        }));

        console.log("[Netlify Function] Processed events count:", processedEvents.length);

        return {
            statusCode: 200,
            body: JSON.stringify(processedEvents),
            headers: { 'Content-Type': 'application/json' },
        };

    } catch (error) {
        console.error("[Netlify Function] Error fetching from SerpApi:", error);
        return { statusCode: 500, body: JSON.stringify({ error: `Failed to fetch events via proxy: ${error.message}` }), headers: { 'Content-Type': 'application/json' } };
    }
};
