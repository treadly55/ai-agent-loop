// src/main.js
import { runWeekendAgent } from './agent.js'; // Import the refactored agent

// IMPORTANT: Replace these placeholder values with the actual string keys your Events API expects.
const EVENT_API_KEY_FOR_TODAY = "date:today";         // Replace with actual key
const EVENT_API_KEY_FOR_TOMORROW = "date:tomorrow";   // Replace with actual key
const EVENT_API_KEY_FOR_THIS_WEEK = "date:week";      // Replace with actual key

// Hardcode the city for this simplified version
const CITY = "Sydney";

document.addEventListener('DOMContentLoaded', () => {
    const timeframeButtons = document.querySelectorAll('.timeframe-buttons button');
    const resultsArea = document.getElementById('results-area');

    let isAgentRunning = false;

    // Function to handle button clicks
    async function handleTimeframeClick(event) {
        if (isAgentRunning) {
            console.log("Agent is already running.");
            return;
        }

        // Get the specific event key from the button's data attribute
        const eventApiKeyString = event.target.dataset.timeframeKey;
        // Map the internal key to the actual API key needed
        let actualEventApiKey;
        switch(eventApiKeyString) {
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
                console.error("Unknown timeframe key:", eventApiKeyString);
                resultsArea.innerHTML = '<p style="color: red;">Invalid timeframe selected.</p>';
                return;
        }

        const timeframeDescription = event.target.textContent; // "Today", "Tomorrow", "This Week"

        isAgentRunning = true;
        // Disable all buttons while running
        timeframeButtons.forEach(btn => btn.disabled = true);
        resultsArea.innerHTML = `<p>Looking for exciting events in ${CITY} for '${timeframeDescription}'...</p>`;
        let progressLog = [`<p>Looking for exciting events in ${CITY} for '${timeframeDescription}'...</p>`];

        // Simple progress update callback
        function updateProgress(message) {
            console.log('[Progress]', message);
            // Append message to a list inside results area
            progressLog.push(`<li>${message}</li>`);
            resultsArea.innerHTML = `<ul>${progressLog.join('')}</ul>`;
        }

        try {
            updateProgress(`Using Events API key: '${actualEventApiKey}'`);
            console.log(`Calling Agent for City: ${CITY}, Event Key: ${actualEventApiKey}`);

            // Call the agent with only the event key
            const recommendations = await runWeekendAgent(
                actualEventApiKey,
                updateProgress
            );

            // Display final recommendations
            resultsArea.innerHTML = `<h2>Top Event Suggestions for ${CITY} (${timeframeDescription})</h2><p>${recommendations.replace(/\n/g, '<br>')}</p>`;
            console.log("Final Recommendations:", recommendations);

        } catch (error) {
            console.error("Error getting recommendations:", error);
            resultsArea.innerHTML = `<p style="color: red;">Sorry, an error occurred: ${error.message}</p>`;
            updateProgress(`Error: ${error.message}`); // Show error in progress log too
        } finally {
            isAgentRunning = false;
            // Re-enable all buttons
            timeframeButtons.forEach(btn => btn.disabled = false);
        }
    }

    // Add event listeners to each timeframe button
    timeframeButtons.forEach(button => {
        button.addEventListener('click', handleTimeframeClick);
    });

});
