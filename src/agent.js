// src/agent.js
import { openai } from './openaiClient.js';
import { availableFunctions } from './tools.js';

// System Prompt (should be the version that accepts 'city' as a parameter)
const systemPrompt = `
You are "Weekend Away," an AI assistant. Your SOLE initial task is to fetch event data for a given city. Your ultimate goal is to recommend the 2 most exciting-sounding events from that data.

Your process MUST be followed rigidly:

**Step 1: Fetch Event Data (MANDATORY FIRST ACTION)**
* You will be given a 'city' name (e.g., "Sydney, New South Wales, Australia") and an 'eventKey' string.
* Your VERY FIRST action, without any other thought or preamble, MUST be to use the 'getEvents' tool.
* You MUST use the provided 'city' for the 'city' argument and the exact 'eventKey' string provided to you for the 'eventKey' argument in the tool call.
* Output this action in the format: Action: getEvents: {"city": "THE_PROVIDED_CITY", "eventKey": "the_provided_event_key"}\nPAUSE

**Step 2: Analyze Event Data (After Observation)**
* Once you receive the 'Observation:' containing the list of events (which will include 'name', 'description', and 'link' fields for each event):
    * Carefully read the 'name' and 'description' of each event.
    * Identify the 2 events that sound the most exciting, fun, unique, or engaging based *only* on the text in their name and description.

**Step 3: Format Final Output (After Analysis)**
* After selecting the top 2 events, provide your response containing ONLY the user-facing recommendation.
* Do NOT include "Thought:", "Action:", "Observation:", or any other internal dialogue or conversational text in this final output.
* Your entire final output message should consist ONLY of the following structure:
    * An introductory sentence like "Based on the events for [City Name - just the city part], here are the two that sound most exciting!".
    * For each of the 2 recommended events, format it as follows:
        * Start with a bullet point (* or -).
        * Include the event's name as a clickable link using HTML: <a href="EVENT_LINK_URL" target="_blank" rel="noopener noreferrer">EVENT_NAME</a>. Replace EVENT_LINK_URL with the actual 'link' value from the event data and EVENT_NAME with the event's 'name'. Use target="_blank" to open in a new tab.
        * After the link, add a colon (:).
        * Briefly state why it sounds exciting, quoting or paraphrasing the 'description'.

Available Tool:
1.  **getEvents**:
    * Description: Finds events happening in the specified 'city' for the timeframe represented by the 'eventKey'.
    * Arguments: {"city": "THE_PROVIDED_CITY_STRING", "eventKey": "the_exact_event_key_string_provided_to_you"}
    * Returns: JSON string of event objects, where each object includes 'name', 'description', and 'link' fields.

Interaction Flow:
1.  Thought: (Optional for first step) My only first step is to call getEvents with the provided city and eventKey.
2.  Action: getEvents: {"city": "THE_PROVIDED_CITY", "eventKey": "provided_event_key"}\nPAUSE
3.  PAUSE
4.  Observation: (List of events from the tool)
5.  Thought: Now I will analyze these events for [City Name] and pick the top 2 most exciting.
6.  Final Output: (Formatted HTML recommendations for the specified city)

Example of the ONLY valid format for your final response message:
Based on the events for Melbourne, here are the two that sound most exciting!
* <a href="http://example.com/secret-cinema" target="_blank" rel="noopener noreferrer">Secret Cinema Screening</a>: This sounds thrilling because the location and theme are a surprise, making it an 'Immersive cinema experience'!
* <a href="http://example.com/flash-mob" target="_blank" rel="noopener noreferrer">Flash Mob Dance Performance</a>: Catch this for 'Unexpected and energetic dance routines popping up'!
`;
// --- End Updated System Prompt ---

export async function runWeekendAgent(city, eventApiKeyString, progressCallback) {
    // *** ADD THESE DIAGNOSTIC LOGS ***
    console.log('[AGENT.JS ENTRY] Received city:', city);
    console.log('[AGENT.JS ENTRY] Received eventApiKeyString:', eventApiKeyString);
    console.log('[AGENT.JS ENTRY] Received progressCallback type:', typeof progressCallback);
    console.log('[AGENT.JS ENTRY] Received progressCallback value:', progressCallback);
    // *** END DIAGNOSTIC LOGS ***

    // This is line 58 (approx) where the error occurs if progressCallback is not a function
    progressCallback(`Initializing agent for ${city} with key: ${eventApiKeyString}`);
    
    const userQuery = `Fetch events for city '${city}' using event key '${eventApiKeyString}' and then recommend the top 2 most exciting ones. Follow the system prompt's formatting instructions precisely for the final output.`;

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userQuery }
    ];

    const MAX_ITERATIONS = 3;
    const actionRegex = /Action:\s*(\w+):\s*({.*?})/s;

    try {
        for (let i = 0; i < MAX_ITERATIONS; i++) {
            progressCallback(`Iteration #${i + 1}: Thinking...`);
            console.log(`--- Iteration ${i + 1} ---`);
            console.log("Messages sent to OpenAI:", JSON.stringify(messages, null, 2));

            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: messages,
                temperature: 0.1,
            });

            const responseMessage = response.choices[0].message;
            const responseText = responseMessage.content;

            console.log("OpenAI Raw Response:", responseText);
            if (!responseText) {
                 progressCallback("Agent provided an empty response. Ending interaction.");
                 console.warn("Agent provided empty response text.");
                 messages.push({role: "assistant", content: ""});
                 return "I seem to be at a loss for words! Could you try again?";
            }
            messages.push(responseMessage);

            const actionMatch = responseText.match(actionRegex);

            if (actionMatch) {
                const actionName = actionMatch[1].trim();
                const actionArgsRaw = actionMatch[2].trim();
                let actionArgs;

                if (actionName !== "getEvents") {
                     console.warn(`Agent tried to call unexpected tool: ${actionName}`);
                     progressCallback(`Error: Agent tried to use an invalid tool '${actionName}'.`);
                     messages.push({ role: "assistant", content: `Observation: Error - Invalid tool '${actionName}'. Only 'getEvents' is available.` });
                     continue;
                }

                try {
                    actionArgs = JSON.parse(actionArgsRaw);
                    console.log(`Attempting to call tool '${actionName}' with parsed arguments:`, actionArgs);
                    progressCallback(`Calling tool: ${actionName} with args: ${JSON.stringify(actionArgs)}`);
                } catch (e) {
                    console.error(`Error parsing action arguments JSON: '${actionArgsRaw}'`, e);
                    progressCallback(`Error understanding action arguments for ${actionName}.`);
                    messages.push({ role: "assistant", content: `Observation: Error parsing the arguments JSON provided: '${actionArgsRaw}'. Please ensure arguments are valid JSON.` });
                    continue;
                }
                 if (!actionArgs.city || !actionArgs.eventKey) {
                    console.error("Missing required arguments (city or eventKey) for getEvents:", actionArgs);
                    progressCallback("Error: Missing city or eventKey argument for getEvents tool.");
                    messages.push({ role: "assistant", content: "Observation: Error - Missing 'city' or 'eventKey' in arguments for getEvents." });
                    continue;
                }
                
                try {
                    console.log(`CONFIRMED: Executing tool function availableFunctions['${actionName}']`);
                    const toolResult = await availableFunctions[actionName](
                        actionArgs.city, 
                        actionArgs.eventKey,
                        actionArgs.categories
                    );
                    messages.push({ role: "assistant", content: `Observation: ${toolResult}` });
                    progressCallback(`Received observation from ${actionName}.`);
                    console.log(`Observation from ${actionName}:`, toolResult);
                } catch (e) {
                    console.error(`Error executing tool ${actionName}:`, e);
                    progressCallback(`Error executing tool ${actionName}.`);
                    messages.push({ role: "assistant", content: `Observation: Error running ${actionName}: ${e.message}` });
                }

                 if (!responseText.includes("PAUSE")) {
                    console.warn("AI response had an Action but may not have included PAUSE explicitly after the JSON.");
                }
            } else {
                progressCallback("Agent finished. Processing final answer.");
                console.log("Final response from AI:", responseText);
                return responseText.trim();
            }
        }
        progressCallback("Agent reached maximum iterations.");
        return "Sorry, I couldn't finalize the suggestions within the allowed steps.";

    } catch (error) {
        console.error("Error in agent loop:", error);
        // Check if progressCallback is a function before calling it in the catch block
        if (typeof progressCallback === 'function') {
            progressCallback("An error occurred while processing your request.");
        } else {
            console.error("progressCallback is not a function in catch block either. Original error:", error.message);
        }
        
        if (error.response && error.response.data && error.response.data.error) {
            console.error("OpenAI API Error Details:", error.response.data.error.message);
            return `Error communicating with AI: ${error.response.data.error.message}`;
        }
        return `An unexpected error occurred: ${error.message}`;
    }
}
