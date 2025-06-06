const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const OPENWEATHER_FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";

// Hardcoded coordinates for our supported cities
const cityCoordinates = {
    "Sydney, AU": { lat: -33.8688, lon: 151.2093, displayName: "Sydney" },
    "Melbourne, AU": { lat: -37.8136, lon: 144.9631, displayName: "Melbourne" },
    "Brisbane, AU": { lat: -27.4698, lon: 153.0251, displayName: "Brisbane" },
    "Perth, AU": { lat: -31.9505, lon: 115.8605, displayName: "Perth" },
    "Adelaide, AU": { lat: -34.9285, lon: 138.6007, displayName: "Adelaide" }
};

exports.handler = async (event, context) => {
    const { cityFullName, date: targetDateStr } = event.queryStringParameters;

    if (!cityFullName || !targetDateStr) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing 'cityFullName' or 'date' query parameter." }) };
    }
    if (!WEATHER_API_KEY) {
        console.error("[Weather Fn] OpenWeatherMap API Key is missing.");
        return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error: Weather API Key missing." }) };
    }

    const coordinates = cityCoordinates[cityFullName];
    if (!coordinates) {
        console.error(`[Weather Fn] Coordinates not found for city: ${cityFullName}`);
        return { statusCode: 404, body: JSON.stringify({ error: `Unsupported city for weather lookup: ${cityFullName}` }) };
    }

    const { lat, lon, displayName } = coordinates;

    try {
        const weatherParams = new URLSearchParams({
            lat: lat,
            lon: lon,
            appid: WEATHER_API_KEY,
            units: 'metric',
        });
        const weatherUrl = `${OPENWEATHER_FORECAST_URL}?${weatherParams.toString()}`;
        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();

        if (!weatherResponse.ok || weatherData.cod !== "200") {
            console.error("[Weather Fn] Weather data fetch failed. Response:", weatherData);
            return { statusCode: 502, body: JSON.stringify({ error: `Failed to fetch weather data: ${weatherData.message || 'Unknown error'}` }) };
        }

        let relevantForecastsForDay = [];
        for (const forecast of weatherData.list) {
            if (forecast.dt_txt.startsWith(targetDateStr)) {
                relevantForecastsForDay.push({
                    time: forecast.dt_txt.split(' ')[1],
                    main: forecast.weather[0]?.main || "N/A",
                    description: forecast.weather[0]?.description || "N/A",
                    temp: forecast.main?.temp,
                    temp_max: forecast.main?.temp_max,
                    temp_min: forecast.main?.temp_min,
                    humidity: forecast.main?.humidity,
                    wind_speed: forecast.wind?.speed,
                    icon: forecast.weather[0]?.icon
                });
            }
        }

        if (relevantForecastsForDay.length === 0) {
            console.warn(`[Weather Fn] No forecast entries found for target date ${targetDateStr} for ${displayName}. Full list count: ${weatherData.list?.length}`);
            return { statusCode: 404, body: JSON.stringify({ error: `No weather forecast entries found for ${targetDateStr} in ${displayName}.` }) };
        }

        let representativeForecast = relevantForecastsForDay.find(f => f.time === "12:00:00" || f.time === "15:00:00") || relevantForecastsForDay[0];
        
        let dayMinTemp = representativeForecast.temp_min;
        let dayMaxTemp = representativeForecast.temp_max;
        if(relevantForecastsForDay.length > 1) {
            dayMinTemp = Math.min(...relevantForecastsForDay.map(f => f.temp_min ?? f.temp));
            dayMaxTemp = Math.max(...relevantForecastsForDay.map(f => f.temp_max ?? f.temp));
        }


        const finalForecast = {
            date: targetDateStr,
            city: displayName,
            main: representativeForecast.main,
            description: representativeForecast.description,
            temp_max: parseFloat(dayMaxTemp.toFixed(1)),
            temp_min: parseFloat(dayMinTemp.toFixed(1)),
            icon: representativeForecast.icon,
        };

        return { statusCode: 200, body: JSON.stringify(finalForecast) };

    } catch (error) {
        console.error(`[Weather Fn] General Error for ${displayName}:`, error);
        return { statusCode: 500, body: JSON.stringify({ error: `Weather function error for ${displayName}: ${error.message}` }) };
    }
};
