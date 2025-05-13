import { runWeekendAgent } from './agent.js';
import '/style.css'; 

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
    const initialPromptMessage = document.getElementById('initial-prompt-message'); // Get reference
    const retrySection = document.getElementById('retry-section');
    const retryButton = document.getElementById('btn-retry');

    let isAgentRunning = false;

    function resetUIForNewSearch() {
        resultsArea.innerHTML = ''; // Clear all dynamic content (like progress <ul> or results)
        if (initialPromptMessage) {
            initialPromptMessage.style.display = 'block'; // Show initial prompt
            resultsArea.appendChild(initialPromptMessage); // Ensure it's back if innerHTML was cleared
        }
        resultsArea.classList.remove('results-area-loading');
        retrySection.classList.add('hidden');
        citySelect.disabled = false;
        citySelect.value = ""; 
        timeframeButtons.forEach(btn => btn.disabled = false);
    }

    async function handleTimeframeClick(event) {
        if (isAgentRunning) {
            console.log("Agent is already running.");
            return;
        }

        const selectedCityValue = citySelect.value;
        if (!selectedCityValue) {
            resultsArea.innerHTML = '<p style="color: red;">Please select a city first.</p>'; // Keep error message simple
            if (initialPromptMessage) initialPromptMessage.style.display = 'none'; // Hide prompt if error shown
            resultsArea.classList.remove('results-area-loading');
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
                if (initialPromptMessage) initialPromptMessage.style.display = 'none';
                resultsArea.classList.remove('results-area-loading');
                retrySection.classList.add('hidden');
                return;
        }

        const timeframeDescription = event.target.textContent;

        isAgentRunning = true;
        timeframeButtons.forEach(btn => btn.disabled = true);
        citySelect.disabled = true;
        
        if (initialPromptMessage) initialPromptMessage.style.display = 'none'; // Hide initial prompt
        resultsArea.classList.add('results-area-loading');
        // Initialize resultsArea with an empty ul for progress, or a starting message
        resultsArea.innerHTML = `<ul><li>Looking for exciting events in ${selectedCityDisplay} for '${timeframeDescription}'...</li></ul>`;
        
        retrySection.classList.add('hidden');
        let progressLog = [`<li>Looking for exciting events in ${selectedCityDisplay} for '${timeframeDescription}'...</li>`];

        function updateProgress(message) {
            console.log('[Progress]', message);
            progressLog.push(`<li>${message}</li>`);
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
            
            resultsArea.classList.remove('results-area-loading'); 
            // The initial-prompt-message is already hidden. Now we overwrite innerHTML.
            resultsArea.innerHTML = `<h2>Top Event Suggestions for ${selectedCityDisplay} (${timeframeDescription})</h2><p>${recommendations.replace(/\n/g, '<br>')}</p>`;
            console.log("Final Recommendations:", recommendations);
            retrySection.classList.remove('hidden');

        } catch (error) {
            console.error("Error getting recommendations:", error);
            resultsArea.classList.remove('results-area-loading');
            // The initial-prompt-message is already hidden. Now we overwrite innerHTML.
            resultsArea.innerHTML = `<p style="color: red;">Sorry, an error occurred: ${error.message}</p>`;
            // updateProgress(`Error: ${error.message}`); // This would add to the ul, might be confusing with fixed error msg
            retrySection.classList.remove('hidden');
        } finally {
            isAgentRunning = false;
        }
    }

    timeframeButtons.forEach(button => {
        button.addEventListener('click', handleTimeframeClick);
    });

    if (retryButton) {
        retryButton.addEventListener('click', () => {
            console.log("Retry button clicked.");
            resetUIForNewSearch();
        });
    }

    // Ensure initial state is correct
    if(initialPromptMessage) initialPromptMessage.style.display = 'block';
});
