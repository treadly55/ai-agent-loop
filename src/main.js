// src/main.js
import { runWeekendAgent } from './agent.js';

// IMPORTANT: Replace these placeholder values with the actual string keys your Events API expects.
const EVENT_API_KEY_FOR_TODAY = "date:today";
const EVENT_API_KEY_FOR_TOMORROW = "date:tomorrow";
const EVENT_API_KEY_FOR_THIS_WEEK = "date:week";

document.addEventListener('DOMContentLoaded', () => {
    const citySelect = document.getElementById('city-select'); // Get city select element
    const timeframeButtons = document.querySelectorAll('.timeframe-buttons button');
    const resultsArea = document.getElementById('results-area');

    let isAgentRunning = false;

    async function handleTimeframeClick(event) {
        if (isAgentRunning) {
            console.log("Agent is already running.");
            return;
        }

        const selectedCityValue = citySelect.value; // Get selected city
        if (!selectedCityValue) {
            resultsArea.innerHTML = '<p style="color: red;">Please select a city first.</p>';
            return;
        }
        // The value of citySelect is "CityName, State, Country". We only need "CityName, State, Country" for SerpApi location.
        const selectedCityForAPI = selectedCityValue; 
        // For display purposes, we can just use the part before the first comma or the whole thing.
        const selectedCityDisplay = selectedCityValue.split(',')[0];


        const eventApiKeyStringInternal = event.target.dataset.timeframeKey;
        let actualEventApiKey;
        switch(eventApiKeyStringInternal) {
            case 'today':
                actualEventApiKey = EVENT_API_KEY_FOR_TODAY;
                break;
            case 'tomorrow':
                actualEventApiKey = EVENT_API_KEY_FOR_TOMORROW;
                break;
            case 'week':
                actualEventApiKey = EVENT_API_KEY_FOR_THIS_WEEK;
                break;
            default:
                console.error("Unknown timeframe key:", eventApiKeyStringInternal);
                resultsArea.innerHTML = '<p style="color: red;">Invalid timeframe selected.</p>';
                return;
        }

        const timeframeDescription = event.target.textContent;

        isAgentRunning = true;
        timeframeButtons.forEach(btn => btn.disabled = true);
        citySelect.disabled = true; // Disable city select while running
        resultsArea.innerHTML = `<p>Looking for exciting events in ${selectedCityDisplay} for '${timeframeDescription}'...</p>`;
        let progressLog = [`<p>Looking for exciting events in ${selectedCityDisplay} for '${timeframeDescription}'...</p>`];

        function updateProgress(message) {
            console.log('[Progress]', message);
            progressLog.push(`<li>${message}</li>`);
            resultsArea.innerHTML = `<ul>${progressLog.join('')}</ul>`;
        }

        try {
            updateProgress(`Using Events API key: '${actualEventApiKey}' for city: ${selectedCityForAPI}`);
            console.log(`Calling Agent for City: ${selectedCityForAPI}, Event Key: ${actualEventApiKey}`);

            // Call the agent with the selected city and event key
            const recommendations = await runWeekendAgent(
                selectedCityForAPI, // Pass the city to the agent
                actualEventApiKey,
                updateProgress
            );

            resultsArea.innerHTML = `<h2>Top Event Suggestions for ${selectedCityDisplay} (${timeframeDescription})</h2><p>${recommendations.replace(/\n/g, '<br>')}</p>`;
            console.log("Final Recommendations:", recommendations);

        } catch (error) {
            console.error("Error getting recommendations:", error);
            resultsArea.innerHTML = `<p style="color: red;">Sorry, an error occurred: ${error.message}</p>`;
            updateProgress(`Error: ${error.message}`);
        } finally {
            isAgentRunning = false;
            timeframeButtons.forEach(btn => btn.disabled = false);
            citySelect.disabled = false; // Re-enable city select
        }
    }

    timeframeButtons.forEach(button => {
        button.addEventListener('click', handleTimeframeClick);
    });
});
