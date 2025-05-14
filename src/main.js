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
  const initialPromptMessage = document.getElementById('initial-prompt-message');
  const retrySection = document.getElementById('retry-section');
  const retryButton = document.getElementById('btn-retry');

  let isAgentRunning = false;

  function resetUIForNewSearch() {
    resultsArea.innerHTML = ''; // Clear all dynamic content
        resultsArea.style.display = 'none'; // Hide results area
        resultsArea.classList.remove('results-in-progress'); // Remove progress styling class
        resultsArea.classList.remove('results-area-loading'); // Remove loading box class

    // Re-show the initial prompt message if it's part of the static HTML and you want it back
        // However, the initial prompt is *inside* resultsArea in your HTML, so hiding resultsArea hides it.
        // If the initial prompt was outside resultsArea, you'd manage its visibility separately.
        // For now, let's ensure the initial prompt text is re-added if needed, though it's inside resultsArea.
        // If resultsArea is cleared and then initialPromptMessage (which is a child) is hidden/shown, it might be complex.
        // A simpler approach is to re-add the prompt text if resultsArea is empty and meant to be shown.
        // But since resultsArea is hidden on reset, the prompt inside it is also hidden.
        // The initial prompt message element itself is still in resultsArea from the HTML.
        // We will handle its visibility when search starts instead.
        if (initialPromptMessage) {
            // Ensure the initial prompt message element itself is available if needed later.
            // If innerHTML cleared it, we'd have to re-create or re-append it.
            // The original HTML for initialPromptMessage is <p id="initial-prompt-message">Choose a city and timeframe above to find events.</p>
            // If it's cleared by resultsArea.innerHTML = '', it's gone.
            // So, we should hide/show the initialPromptMessage *element* rather than relying on it being in innerHTML.
            // For this implementation, initialPromptMessage is within resultsArea. So if resultsArea is hidden, it's hidden.
            // The logic below for `initialPromptMessage.style.display = 'block'` in `handleTimeframeClick` will manage its visibility.
            // The main thing for reset is hiding resultsArea.
        }

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
            // If resultsArea is intended to show this error, make it visible first
            resultsArea.style.display = 'block';
            resultsArea.classList.remove('results-in-progress'); // Not in progress state for this error
            resultsArea.classList.remove('results-area-loading'); // Not loading
      resultsArea.innerHTML = '<p style="color: red;">Please select a city first.</p>';
      if (initialPromptMessage) initialPromptMessage.style.display = 'none';
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
                resultsArea.style.display = 'block'; // Show results area for error
                resultsArea.classList.remove('results-in-progress');
                resultsArea.classList.remove('results-area-loading');
        resultsArea.innerHTML = '<p style="color: red;">Invalid timeframe selected.</p>';
        if (initialPromptMessage) initialPromptMessage.style.display = 'none';
        retrySection.classList.add('hidden');
        return;
    }

    const timeframeDescription = event.target.textContent;

    isAgentRunning = true;
    timeframeButtons.forEach(btn => btn.disabled = true);
    citySelect.disabled = true;
    
        // Prepare resultsArea for progress display
        resultsArea.innerHTML = ''; // Clear previous content
    if (initialPromptMessage) {
            // The initialPromptMessage is a child of resultsArea.
            // If we want to hide it specifically, we can do initialPromptMessage.style.display = 'none';
            // However, the innerHTML clear above would have removed it if it wasn't preserved.
            // Let's ensure the actual initialPromptMessage *element* is hidden.
            initialPromptMessage.style.display = 'none'; 
        }

        resultsArea.style.display = 'block'; // Make results-area visible for progress
        resultsArea.classList.add('results-in-progress'); // Add class for green/terminal font
    resultsArea.classList.add('results-area-loading'); // For loading box animation

    // Initialize resultsArea with an empty ul for progress, or a starting message
    resultsArea.innerHTML = `<ul><li>Looking for exciting events in ${selectedCityDisplay} for '${timeframeDescription}'...</li></ul>`;
    
    retrySection.classList.add('hidden');
    let progressLog = [`<li>Looking for exciting events in ${selectedCityDisplay} for '${timeframeDescription}'...</li>`];

    function updateProgress(message) {
      console.log('[Progress]', message);
      progressLog.push(`<li>${message}</li>`);
      resultsArea.innerHTML = `<ul>${progressLog.join('')}</ul>`; // This will inherit .results-in-progress styling
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
      
            resultsArea.classList.remove('results-in-progress'); // Remove special font/color before showing final results
      resultsArea.classList.remove('results-area-loading'); 
            // The initialPromptMessage is already dealt with (hidden or removed by innerHTML overwrite)
      resultsArea.innerHTML = `<h2>Top Event Suggestions for ${selectedCityDisplay} (${timeframeDescription})</h2><p>${recommendations.replace(/\n/g, '<br>')}</p>`;
      console.log("Final Recommendations:", recommendations);
      retrySection.classList.remove('hidden');

    } catch (error) {
      console.error("Error getting recommendations:", error);
            resultsArea.classList.remove('results-in-progress'); // Remove special font/color before showing error
      resultsArea.classList.remove('results-area-loading');
            // The initialPromptMessage is already dealt with
      resultsArea.innerHTML = `<p style="color: red;">Sorry, an error occurred: ${error.message}</p>`;
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
            // After reset, the initial prompt (if desired) needs to be handled.
            // Since resultsArea is now hidden, the prompt within it is also hidden.
            // If the prompt should reappear on its own (outside resultsArea), that's different.
            // But current HTML has it inside.
            // The current resetUIForNewSearch hides resultsArea, which is correct.
            // The original index.html includes:
            // <div id="results-area">
            //    <p id="initial-prompt-message">Choose a city and timeframe above to find events.</p>
            // </div>
            // If resultsArea is hidden, initial-prompt-message is hidden. This seems intended.
            // If a search is then started, handleTimeframeClick will show resultsArea and hide initial-prompt-message
            // before showing progress.
    });
  }

    // Initial state management for initialPromptMessage (ensure it's displayed if resultsArea is not yet used)
    // Given resultsArea starts as display:none, initialPromptMessage inside it will also be hidden.
    // This is the desired "hidden until after the search begins" behavior for the entire block.
    // So, no explicit action needed here for initialPromptMessage at DOMContentLoaded
    // if resultsArea's display:none in CSS handles it.

    // The line below was from original, if results-area was visible by default, this would show the prompt inside it.
    // if(initialPromptMessage) initialPromptMessage.style.display = 'block';
    // But since #results-area is now display:none initially, this won't make the prompt visible until #results-area is shown.
});