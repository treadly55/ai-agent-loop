// netlify/functions/get-events.js

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;
// WEATHER_API_KEY is no longer needed here as we removed geocoding
const SERPAPI_BASE_URL = "https://serpapi.com/search.json";

// Mapping for city names to the format SerpApi might prefer for its 'location' parameter
const cityLocationMapping = {
    "Sydney, AU": "Sydney, New South Wales, Australia",
    "Melbourne, AU": "Melbourne, Victoria, Australia",
    "Brisbane, AU": "Brisbane, Queensland, Australia",
    "Perth, AU": "Perth, Western Australia, Australia",
    "Adelaide, AU": "Adelaide, South Australia, Australia"
};

exports.handler = async (event, context) => {
    const { eventApiKeyString, city } = event.queryStringParameters; // city is "City, AU" from frontend

    if (!eventApiKeyString || !city) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing 'eventApiKeyString' or 'city' query parameter." }) };
    }
    if (!SERPAPI_API_KEY) {
        console.error("[GetEvents Fn] SerpApi API Key is missing.");
        return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error: SerpApi Key missing." }) };
    }

    // Use the mapped location string for SerpApi, or fallback to the provided city string if not in map
    const locationForSerpApi = cityLocationMapping[city] || city;
    console.log(`[GetEvents Fn] Using location string for SerpApi: '${locationForSerpApi}' (original input: '${city}')`);

    const params = new URLSearchParams();
    params.append('engine', 'google_events');
    params.append('q', 'events');
    params.append('location', locationForSerpApi); // Use the mapped or original city string
    params.append('gl', 'au');
    params.append('hl', 'en');
    params.append('htichips', eventApiKeyString);
    params.append('api_key', SERPAPI_API_KEY);

    const requestUrl = `${SERPAPI_BASE_URL}?${params.toString()}`;
    console.log(`[GetEvents Fn] Requesting SerpApi URL with location string: ${requestUrl}`);

    try {
        const response = await fetch(requestUrl);
        const data = await response.json();
        console.log(`[GetEvents Fn] SerpApi Response Status: ${response.status}`);

        if (data.error) {
            console.error("[GetEvents Fn] Error from SerpApi:", data.error);
            return { statusCode: response.status === 400 ? 400 : 502, body: JSON.stringify({ error: `SerpApi Error: ${data.error}` }) };
        }
        if (!data.events_results || !Array.isArray(data.events_results)) {
            console.warn("[GetEvents Fn] No 'events_results' array in SerpApi response for location:", locationForSerpApi);
            return { statusCode: 200, body: JSON.stringify([]) };
        }

        const processedEvents = data.events_results.map(event => ({
            id: event.link || event.event_location_map?.link || `serpapi_${Math.random().toString(16).slice(2)}`,
            name: event.title || "Unnamed Event",
            description: event.description || "No description available.",
            date: event.date?.when || "Date unknown",
            location: event.address?.join(', ') || event.venue?.name || "Location unknown",
            category: event.knowledge_graph?.type || "Event",
            link: event.link || event.event_location_map?.link || null
        }));
        console.log(`[GetEvents Fn] Processed ${processedEvents.length} events for ${locationForSerpApi}`);
        return { statusCode: 200, body: JSON.stringify(processedEvents) };

    } catch (error) {
        console.error(`[GetEvents Fn] Error fetching from SerpApi for ${locationForSerpApi}:`, error);
        return { statusCode: 500, body: JSON.stringify({ error: `Failed to fetch events via proxy for ${locationForSerpApi}: ${error.message}` }) };
    }
};
