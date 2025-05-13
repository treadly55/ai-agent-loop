// src/main.js
import { runWeekendAgent } from './agent.js';

const EVENT_API_KEY_FOR_TODAY = "date:today";
const EVENT_API_KEY_FOR_TOMORROW = "date:tomorrow";

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

document.addEventListener('DOMContentLoaded', () => {
    const citySelect = document.getElementById('city-select');
    const timeframeButtons = document.querySelectorAll('.timeframe-buttons button');
    const resultsArea = document.getElementById('results-area');
    const retrySection = document.getElementById('retry-section');
    const retryButton = document.getElementById('btn-retry');

    const initialResultsMessage = '<p>Choose a city and timeframe above to find events.</p>';
    let isAgentRunning = false;

    function resetUIForNewSearch() {
        resultsArea.innerHTML = initialResultsMessage;
        resultsArea.classList.remove('results-area-loading'); // Remove loading class
        retrySection.classList.add('hidden');
        citySelect.disabled = false;
        citySelect.value = ""; // Reset city dropdown
        timeframeButtons.forEach(btn => btn.disabled = false);
    }

    async function handleTimeframeClick(event) {
        if (isAgentRunning) {
            console.log("Agent is already running.");
            return;
        }

        const selectedCityValue = citySelect.value;
        if (!selectedCityValue) {
            resultsArea.innerHTML = '<p style="color: red;">Please select a city first.</p>';
            resultsArea.classList.remove('results-area-loading'); // Ensure loading class is off
            retrySection.classList.add('hidden');
            return;
        }
        const selectedCityForAPI = selectedCityValue;
        const selectedCityDisplay = selectedCityValue.split(',')[0];

        const eventApiKeyStringInternal = event.target.dataset.timeframeKey;
        let actualEventApiKey;
        let weatherDate;

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
            default:
                console.error("Unknown timeframe key:", eventApiKeyStringInternal);
                resultsArea.innerHTML = '<p style="color: red;">Invalid timeframe selected.</p>';
                resultsArea.classList.remove('results-area-loading');
                retrySection.classList.add('hidden');
                return;
        }

        const timeframeDescription = event.target.textContent;

        isAgentRunning = true;
        timeframeButtons.forEach(btn => btn.disabled = true);
        citySelect.disabled = true;
        
        // Add loading class and set initial message for progress
        resultsArea.classList.add('results-area-loading');
        resultsArea.innerHTML = `<ul><li>Looking for exciting events in ${selectedCityDisplay} for '${timeframeDescription}'...</li></ul>`; // Start with ul for consistent styling
        
        retrySection.classList.add('hidden');
        let progressLog = [`<li>Looking for exciting events in ${selectedCityDisplay} for '${timeframeDescription}'...</li>`]; // Keep track of log items

        function updateProgress(message) {
            console.log('[Progress]', message);
            progressLog.push(`<li>${message}</li>`);
            // Update the content of the resultsArea, which is now fixed height and overflow hidden
            // The flexbox properties will keep the latest messages at the bottom
            resultsArea.innerHTML = `<ul>${progressLog.join('')}</ul>`;
        }

        try {
            updateProgress(`Weather will be checked for: ${weatherDate}.`);
            updateProgress(`Using Events API key: '${actualEventApiKey}' for city: ${selectedCityForAPI}`);
            console.log(`Calling Agent for City: ${selectedCityForAPI}, Event Key: ${actualEventApiKey}, Weather Date: ${weatherDate}`);

            const recommendations = await runWeekendAgent(
                selectedCityForAPI,
                actualEventApiKey,
                weatherDate,
                updateProgress
            );
            
            resultsArea.classList.remove('results-area-loading'); // Remove loading class to allow expansion
            resultsArea.innerHTML = `<h2>Top Event Suggestions for ${selectedCityDisplay} (${timeframeDescription})</h2><p>${recommendations.replace(/\n/g, '<br>')}</p>`;
            console.log("Final Recommendations:", recommendations);
            retrySection.classList.remove('hidden');

        } catch (error) {
            console.error("Error getting recommendations:", error);
            resultsArea.classList.remove('results-area-loading'); // Remove loading class on error too
            resultsArea.innerHTML = `<p style="color: red;">Sorry, an error occurred: ${error.message}</p>`;
            updateProgress(`Error: ${error.message}`); // This will be inside the fixed height box
            retrySection.classList.remove('hidden');
        } finally {
            isAgentRunning = false;
            // Buttons and select remain disabled until retry is clicked
        }
    }

    timeframeButtons.forEach(button => {
        button.addEventListener('click', handleTimeframeClick);
    });

    if (retryButton) {
        retryButton.addEventListener('click', () => {
            console.log("Retry button clicked.");
            resetUIForNewSearch(); // This already removes the loading class
        });
    }
});
