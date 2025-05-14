// src/agent.js
import { openai } from './openaiClient.js';
import { availableFunctions } from './tools.js';

// System Prompt Updated for single weatherDate and getWeather tool
const systemPrompt = `
You are "Weekend Away," an AI assistant. Your goal is to fetch event data and weather for a given city and timeframe key, then recommend the 2 most exciting-sounding events, incorporating weather insights.

Your process MUST be followed rigidly:

**Step 1: Fetch Event Data (MANDATORY FIRST ACTION)**
* You will be given a 'city' name (e.g., "Sydney, New South Wales, Australia"), an 'eventKey' string (e.g., "date:today"), and a specific 'weatherDate' (YYYY-MM-DD).
* Your VERY FIRST action, without any other thought or preamble, MUST be to use the 'getEvents' tool.
* You MUST use the provided 'city' for the 'city' argument and the exact 'eventKey' string for the 'eventKey' argument in the 'getEvents' tool call.
* Output this action in the format: Action: getEvents: {"city": "THE_PROVIDED_CITY", "eventKey": "the_provided_event_key"}\nPAUSE

**Step 2: Fetch Weather Data (MANDATORY SECOND ACTION)**
* After receiving the 'Observation:' with event data, your NEXT action MUST be to use the 'getWeather' tool.
* You MUST use the provided 'city' for the 'city' argument and the provided 'weatherDate' for the 'date' argument in the 'getWeather' tool call.
* Output this action in the format: Action: getWeather: {"city": "THE_PROVIDED_CITY", "date": "THE_PROVIDED_WEATHER_DATE"}\nPAUSE

**Step 3: Analyze Event and Weather Data (After Both Observations)**
* Once you receive the 'Observation:' containing the weather data:
    * You now have both event data and weather data.
    * Carefully read the 'name', 'description', and 'link' fields of each event.
    * Consider the weather forecast (e.g., if it's sunny, rainy, warm, cold).
    * Identify the top three events that sound the most exciting, fun, unique, or engaging, AND are suitable for the predicted weather.

**Step 4: Format Final Output (After Analysis)**
* After selecting the top three events, provide your response containing ONLY the user-facing recommendation.
* Do NOT include "Thought:", "Action:", "Observation:", or any other internal dialogue in this final output.
Example of the ONLY valid format for your final response message per event:
content within the <> brackets are for creation instruction.
Keep the same html format as below.

<p>For <chosen city>, with <forecast> expected <use the term Today or Tomorrow>, here are the top three most exciting event ideas that work well with the current weather forecast:</p>
<h3><title of event></h3>
<p><description of event which can be embellished and emphasised with a more sales tone></p>
<a href="http://example.com/kayak-race" target="_blank">Book now</a>


Available Tools:
1.  **getEvents**:
    * Description: Finds events happening in the specified 'city' for the timeframe represented by the 'eventKey'.
    * Arguments: {"city": "THE_PROVIDED_CITY_STRING", "eventKey": "the_exact_event_key_string_provided_to_you"}
    * Returns: JSON string of event objects, where each object includes 'name', 'description', and 'link' fields.
2.  **getWeather**:
    * Description: Gets the weather forecast for the specified 'city' on the specified 'date'.
    * Arguments: {"city": "THE_PROVIDED_CITY_STRING", "date": "YYYY-MM-DD_FORMATTED_DATE"}
    * Returns: JSON string of a weather object (e.g., '{"date": "YYYY-MM-DD", "main": "Clear", "description": "clear sky", "temp_max": 25, "temp_min": 15}').

Interaction Flow Example:
1. User Query (internal): Provides city, eventKey, weatherDate.
2. Thought: First, I must call getEvents.
3. Action: getEvents: {"city": "Melbourne...", "eventKey": "date:today"}
4. PAUSE
5. Observation: (List of events from getEvents tool)
6. Thought: Now I must call getWeather for Melbourne on the provided weatherDate.
7. Action: getWeather: {"city": "Melbourne...", "date": "2025-05-13"}
8. PAUSE
9. Observation: (Weather data from getWeather tool)
10. Thought: Now I will analyze events and weather to pick the top 2 most exciting and weather-appropriate.
11. Final Output: (Formatted HTML recommendations, incorporating weather)

`;
// --- End Updated System Prompt ---

// Updated function signature to accept city, eventApiKeyString, and weatherDate
export async function runWeekendAgent(city, eventApiKeyString, weatherDate, progressCallback) {

    progressCallback(`Initializing agent for ${city} with event key: '${eventApiKeyString}' and weather date: '${weatherDate}'`);
    
    const userQuery = `Fetch events for city '${city}' using event key '${eventApiKeyString}'. Then, fetch the weather for '${city}' on '${weatherDate}'. Finally, recommend the top 2 most exciting events suitable for the weather. Follow the system prompt's formatting instructions precisely for the final output.`;

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userQuery }
    ];

    const MAX_ITERATIONS = 5; // 1. getEvents, 2. getWeather, 3. AI processes and responds.
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

                if (actionName !== "getEvents" && actionName !== "getWeather") {
                     console.warn(`Agent tried to call unexpected tool: ${actionName}`);
                     progressCallback(`Error: Agent tried to use an invalid tool '${actionName}'.`);
                     messages.push({ role: "assistant", content: `Observation: Error - Invalid tool '${actionName}'. Only 'getEvents' and 'getWeather' are available.` });
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
                
                // Validate arguments for each tool
                if (actionName === "getEvents" && (!actionArgs.city || !actionArgs.eventKey)) {
                    console.error("Missing required arguments (city or eventKey) for getEvents:", actionArgs);
                    progressCallback("Error: Missing city or eventKey argument for getEvents tool.");
                    messages.push({ role: "assistant", content: "Observation: Error - Missing 'city' or 'eventKey' in arguments for getEvents." });
                    continue;
                }
                if (actionName === "getWeather" && (!actionArgs.city || !actionArgs.date)) {
                    console.error("Missing required arguments (city or date) for getWeather:", actionArgs);
                    progressCallback("Error: Missing city or date argument for getWeather tool.");
                    messages.push({ role: "assistant", content: "Observation: Error - Missing 'city' or 'date' in arguments for getWeather." });
                    continue;
                }
                
                try {
                    console.log(`CONFIRMED: Executing tool function availableFunctions['${actionName}']`);
                    let toolResult;
                    if (actionName === "getEvents") {
                        toolResult = await availableFunctions[actionName](
                            actionArgs.city, 
                            actionArgs.eventKey,
                            actionArgs.categories // Optional for getEvents
                        );
                    } else if (actionName === "getWeather") {
                        toolResult = await availableFunctions[actionName](
                            actionArgs.city,
                            actionArgs.date // Specific date for getWeather
                        );
                    }
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
