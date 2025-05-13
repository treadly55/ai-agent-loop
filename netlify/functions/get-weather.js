// netlify/functions/get-weather.js

// Use dynamic import for node-fetch v2/v3 compatibility in Netlify Functions
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Retrieve the OpenWeatherMap API key from Netlify environment variables
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const OPENWEATHER_GEO_URL = "http://api.openweathermap.org/geo/1.0/direct"; // For geocoding city name to lat/lon
const OPENWEATHER_ONECALL_URL = "https://api.openweathermap.org/data/3.0/onecall"; // For getting weather forecast

exports.handler = async (event, context) => {
    // Get cityFullName (e.g., "Sydney, New South Wales, Australia") and date (YYYY-MM-DD) from query parameters
    const { cityFullName, date } = event.queryStringParameters;

    // Validate input parameters
    if (!cityFullName || !date) {
        return {
            statusCode: 400, // Bad Request
            body: JSON.stringify({ error: "Missing 'cityFullName' or 'date' query parameter." }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
    if (!WEATHER_API_KEY) {
        console.error("[Weather Fn] OpenWeatherMap API Key (WEATHER_API_KEY) is missing in function environment.");
        return {
            statusCode: 500, // Internal Server Error
            body: JSON.stringify({ error: "Server configuration error: Weather API Key missing." }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    try {
        // --- Step 1: Geocode city name to get latitude and longitude ---
        const geoParams = new URLSearchParams({
            q: cityFullName,
            limit: 1, // We only need the top result
            appid: WEATHER_API_KEY,
        });
        const geoUrl = `${OPENWEATHER_GEO_URL}?${geoParams.toString()}`;
        console.log(`[Weather Fn] Requesting Geocoding URL: ${geoUrl}`);

        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();

        if (!geoResponse.ok || !Array.isArray(geoData) || geoData.length === 0) {
            console.error("[Weather Fn] Geocoding failed or city not found. Response:", geoData);
            return {
                statusCode: 404, // Not Found
                body: JSON.stringify({ error: `City not found or geocoding failed for: ${cityFullName}` }),
                headers: { 'Content-Type': 'application/json' },
            };
        }
        const { lat, lon, name: cityNameFound, country, state } = geoData[0];
        console.log(`[Weather Fn] Geocoded '${cityFullName}' to: ${cityNameFound}, ${state || ''} ${country} (Lat: ${lat}, Lon: ${lon})`);

        // --- Step 2: Get Weather forecast using Latitude/Longitude ---
        // The OneCall API provides a daily forecast for 8 days. We need to find the forecast for the specific 'date'.
        const weatherParams = new URLSearchParams({
            lat: lat,
            lon: lon,
            exclude: 'current,minutely,hourly,alerts', // We only want the daily forecast array
            appid: WEATHER_API_KEY,
            units: 'metric', // Use 'imperial' for Fahrenheit
        });
        const weatherUrl = `${OPENWEATHER_ONECALL_URL}?${weatherParams.toString()}`;
        console.log(`[Weather Fn] Requesting Weather URL: ${weatherUrl}`);

        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();

        if (!weatherResponse.ok || !weatherData || !weatherData.daily) {
            console.error("[Weather Fn] Weather data fetch failed. Response:", weatherData);
            return {
                statusCode: 502, // Bad Gateway (issue with upstream server)
                body: JSON.stringify({ error: "Failed to fetch weather data from OpenWeatherMap." }),
                headers: { 'Content-Type': 'application/json' },
            };
        }

        // --- Step 3: Find the forecast for the specific target 'date' from the daily array ---
        // The 'dt' field in OpenWeatherMap's daily forecast is a UNIX timestamp (seconds).
        // The input 'date' is YYYY-MM-DD.
        let relevantForecastData = null;
        const targetDateStartOfDayTimestamp = new Date(date + "T00:00:00Z").getTime() / 1000;

        for (const dailyForecast of weatherData.daily) {
            // dailyForecast.dt is start of the day, UTC
            const forecastDateStartOfDayTimestamp = dailyForecast.dt;

            if (forecastDateStartOfDayTimestamp === targetDateStartOfDayTimestamp) {
                relevantForecastData = {
                    date: new Date(dailyForecast.dt * 1000).toISOString().split('T')[0], // Format as YYYY-MM-DD
                    main: dailyForecast.weather[0]?.main || "N/A", // e.g., "Clouds", "Rain", "Clear"
                    description: dailyForecast.weather[0]?.description || "N/A", // e.g., "scattered clouds"
                    temp_max: dailyForecast.temp?.max,
                    temp_min: dailyForecast.temp?.min,
                    humidity: dailyForecast.humidity, // Percentage
                    wind_speed: dailyForecast.wind_speed, // meter/sec
                    // OpenWeatherMap icon codes can be used to display weather icons:
                    // http://openweathermap.org/img/wn/ICON_CODE@2x.png
                    icon: dailyForecast.weather[0]?.icon
                };
                break; // Found the forecast for the target date
            }
        }
        
        if (!relevantForecastData) {
             console.warn(`[Weather Fn] No forecast found for target date ${date}. Daily data 'dt' values:`, weatherData.daily.map(d => new Date(d.dt * 1000).toISOString().split('T')[0]));
             return {
                statusCode: 404, // Not Found
                body: JSON.stringify({ error: `No weather forecast found for the specific date: ${date}. Forecasts available for other dates.` }),
                headers: { 'Content-Type': 'application/json' },
             };
        }

        console.log(`[Weather Fn] Relevant forecast for ${date}:`, relevantForecastData);

        // Return the processed data successfully to the frontend
        return {
            statusCode: 200,
            body: JSON.stringify(relevantForecastData), // Return only the specific day's forecast object
            headers: {
                'Content-Type': 'application/json',
            },
        };

    } catch (error) {
        console.error("[Weather Fn] General Error in weather function:", error);
        return {
            statusCode: 500, // Internal Server Error
            body: JSON.stringify({ error: `Weather function encountered an error: ${error.message}` }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};
