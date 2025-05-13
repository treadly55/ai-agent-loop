// src/main.js
import { runWeekendAgent } from './agent.js';
// No longer importing getDateRangeForTimeframe from dateUtils.js

// IMPORTANT: Replace these placeholder values with the actual string keys your Events API expects.
const EVENT_API_KEY_FOR_TODAY = "date:today";
const EVENT_API_KEY_FOR_TOMORROW = "date:tomorrow";
// const EVENT_API_KEY_FOR_THIS_WEEK = "date:week"; // Removed

/**
 * Helper function to format a Date object into YYYY-MM-DD string.
 * @param {Date} date - The date to format.
 * @returns {string} The formatted date string.
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

document.addEventListener('DOMContentLoaded', () => {
    const citySelect = document.getElementById('city-select');
    const timeframeButtons = document.querySelectorAll('.timeframe-buttons button');
    const resultsArea = document.getElementById('results-area');

    let isAgentRunning = false;

    async function handleTimeframeClick(event) {
        if (isAgentRunning) {
            console.log("Agent is already running.");
            return;
        }

        const selectedCityValue = citySelect.value;
        if (!selectedCityValue) {
            resultsArea.innerHTML = '<p style="color: red;">Please select a city first.</p>';
            return;
        }
        const selectedCityForAPI = selectedCityValue;
        const selectedCityDisplay = selectedCityValue.split(',')[0];

        const eventApiKeyStringInternal = event.target.dataset.timeframeKey;
        let actualEventApiKey;
        let weatherDate; // This will be a YYYY-MM-DD string

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        switch(eventApiKeyStringInternal) {
            case 'today':
                actualEventApiKey = EVENT_API_KEY_FOR_TODAY;
                weatherDate = formatDate(today);
                break;
            case 'tomorrow':
                actualEventApiKey = EVENT_API_KEY_FOR_TOMORROW;
                weatherDate = formatDate(tomorrow);
                break;
            // No 'week' case needed anymore
            default:
                console.error("Unknown timeframe key:", eventApiKeyStringInternal);
                resultsArea.innerHTML = '<p style="color: red;">Invalid timeframe selected.</p>';
                return;
        }

        const timeframeDescription = event.target.textContent;

        isAgentRunning = true;
        timeframeButtons.forEach(btn => btn.disabled = true);
        citySelect.disabled = true;
        resultsArea.innerHTML = `<p>Looking for exciting events in ${selectedCityDisplay} for '${timeframeDescription}'...</p>`;
        let progressLog = [`<p>Looking for exciting events in ${selectedCityDisplay} for '${timeframeDescription}'...</p>`];

        function updateProgress(message) {
            console.log('[Progress]', message);
            progressLog.push(`<li>${message}</li>`);
            resultsArea.innerHTML = `<ul>${progressLog.join('')}</ul>`;
        }

        try {
            updateProgress(`Weather will be checked for: ${weatherDate}.`);
            updateProgress(`Using Events API key: '${actualEventApiKey}' for city: ${selectedCityForAPI}`);
            console.log(`Calling Agent for City: ${selectedCityForAPI}, Event Key: ${actualEventApiKey}, Weather Date: ${weatherDate}`);

            // Pass the single weatherDate to the agent
            const recommendations = await runWeekendAgent(
                selectedCityForAPI,
                actualEventApiKey,
                weatherDate, // Pass the specific date for weather
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
            citySelect.disabled = false;
        }
    }

    timeframeButtons.forEach(button => {
        button.addEventListener('click', handleTimeframeClick);
    });
});
