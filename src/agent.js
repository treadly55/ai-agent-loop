// src/agent.js
import { openai } from './openaiClient.js';
import { availableFunctions } from './tools.js';

// City is now hardcoded
const CITY = "Sydney";

// --- Refactored System Prompt ---
const systemPrompt = `
You are "Weekend Away," an AI assistant specializing in finding exciting events in Sydney. Your goal is to recommend the 2 most exciting-sounding events from a list provided to you.

Your process MUST be:
1.  **Receive Event Key**: You will be given an 'eventKey' string representing a timeframe (like 'today', 'tomorrow', or 'this week').
2.  **Get Events**: Immediately use the 'getEvents' tool. You MUST use "Sydney" for the city argument and the exact 'eventKey' string provided to you for the 'eventKey' argument.
3.  **Analyze Events**: Carefully read the 'name' and 'description' of each event returned in the Observation from the 'getEvents' tool.
4.  **Select Top 2 Most Exciting**: Identify the 2 events that sound the most exciting, fun, unique, or engaging based *only* on the text in their name and description. Prioritize events with descriptions suggesting high energy, novelty, or strong appeal.
5.  **Format Final Answer**: Provide your final response strictly in the following format: Start *immediately* with "Answer: ", followed by ONLY the user-facing recommendation. Do NOT include "Thought:", "Action:", "Observation:", or any other internal dialogue in the final answer. Recommend the 2 selected events, mentioning their names and briefly quoting or paraphrasing the part of their description that makes them sound exciting.

Available Tool:
You have access ONLY to the following tool:

1.  **getEvents**:
    * Description: Finds events happening in Sydney for the timeframe represented by the 'eventKey'.
    * Arguments: {"city": "Sydney", "eventKey": "the_exact_event_key_string_provided_to_you"}
    * Returns: JSON string of event objects (e.g., '[{"id": "evt1", "name": "Event Name", "description": "Details..."}]').

Interaction Flow: Thought, Action, PAUSE, Observation.
1.  Thought: State your plan (which is always to call getEvents).
2.  Action: Specify the 'getEvents' tool call with "Sydney" and the provided eventKey. E.g., Action: getEvents: {"city": "Sydney", "eventKey": "date:today"}\nPAUSE
3.  PAUSE
4.  Observation: Result from the system (list of events).
5.  (Internal Thought: Analyze events and select top 2 based on excitement described).
6.  Final Answer: Output using the strict "Answer: ..." format.

Example of the ONLY valid format for your final response:
Answer: Based on the events for Sydney, here are the two that sound most exciting!
* **Secret Cinema Screening:** This sounds thrilling because the location and theme are a surprise, making it an 'Immersive cinema experience'!
* **Flash Mob Dance Performance:** Catch this for 'Unexpected and energetic dance routines popping up'!
`;
// --- End Refactored System Prompt ---

// Refactored function signature
export async function runWeekendAgent(eventApiKeyString, progressCallback) {

    progressCallback(`Initializing agent for Sydney with key: ${eventApiKeyString}`);

    // Simplified user query for the refactored goal
    const userQuery = `User wants the 2 most exciting event suggestions for Sydney using the event key: '${eventApiKeyString}'. Please analyze the events and recommend the top 2 based on how exciting their names and descriptions sound.`;

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userQuery }
    ];

    const MAX_ITERATIONS = 3; // Should only need 1 tool call + 1 final answer
    const actionRegex = /Action:\s*(\w+):\s*({.*?})/s; // Keep the robust regex

    try {
        for (let i = 0; i < MAX_ITERATIONS; i++) {
            progressCallback(`Iteration #${i + 1}: Thinking...`);
            console.log(`--- Iteration ${i + 1} ---`);
            console.log("Messages sent to OpenAI:", JSON.stringify(messages, null, 2));

            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo", // Consider GPT-4 for potentially better "excitement" judgment
                messages: messages,
                temperature: 0.3, // Slightly higher temp might help with subjective "excitement" choice
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

                // Should only be 'getEvents' now
                if (actionName !== "getEvents") {
                     console.warn(`Agent tried to call unexpected tool: ${actionName}`);
                     progressCallback(`Error: Agent tried to use an invalid tool '${actionName}'.`);
                     messages.push({ role: "assistant", content: `Observation: Error - Invalid tool '${actionName}'. Only 'getEvents' is available.` });
                     continue;
                }

                try {
                    actionArgs = JSON.parse(actionArgsRaw);
                    console.log("Successfully parsed action arguments:", actionArgs);
                } catch (e) {
                    console.error(`Error parsing action arguments JSON: '${actionArgsRaw}'`, e);
                    progressCallback(`Error understanding action arguments for ${actionName}.`);
                    messages.push({ role: "assistant", content: `Observation: Error parsing the arguments JSON provided: '${actionArgsRaw}'. Please ensure arguments are valid JSON.` });
                    continue;
                }

                // Check if the required arguments are present
                 if (!actionArgs.city || !actionArgs.eventKey) {
                    console.error("Missing required arguments for getEvents:", actionArgs);
                    progressCallback("Error: Missing city or eventKey argument for getEvents tool.");
                    messages.push({ role: "assistant", content: "Observation: Error - Missing 'city' or 'eventKey' in arguments for getEvents." });
                    continue;
                }
                
                // Call the getEvents tool
                progressCallback(`Calling tool: ${actionName} with args: ${JSON.stringify(actionArgs)}`);
                try {
                    // availableFunctions should only contain getEvents now
                    const toolResult = await availableFunctions[actionName](
                        actionArgs.city, // Should be Sydney
                        actionArgs.eventKey,
                        actionArgs.categories // Pass categories if AI includes them
                    );
                    messages.push({ role: "assistant", content: `Observation: ${toolResult}` });
                    progressCallback(`Received observation from ${actionName}.`);
                } catch (e) {
                    console.error(`Error executing tool ${actionName}:`, e);
                    progressCallback(`Error executing tool ${actionName}.`);
                    messages.push({ role: "assistant", content: `Observation: Error running ${actionName}: ${e.message}` });
                }

                 if (!responseText.includes("PAUSE")) {
                    console.warn("AI response had an Action but may not have included PAUSE explicitly after the JSON.");
                }
            } else {
                // No action found, assume it's the final answer
                progressCallback("Agent finished. Processing final answer.");
                 // Check if the response starts with "Answer:", if not, maybe the AI failed.
                if (!responseText.trim().startsWith("Answer:")) {
                    console.warn("Final response did not start with 'Answer:'. AI might be confused.");
                    progressCallback("Received an unexpected final response format.");
                    // Return the raw response, or a generic error
                    return `I received an unexpected response. Here it is: ${responseText}`; 
                }
                const finalAnswer = responseText.replace(/^Answer:\s*/i, '').trim();
                return finalAnswer;
            }
        }
        progressCallback("Agent reached maximum iterations.");
        return "Sorry, I couldn't finalize the suggestions within the allowed steps.";

    } catch (error) {
        console.error("Error in agent loop:", error);
        progressCallback("An error occurred while processing your request.");
        if (error.response && error.response.data && error.response.data.error) {
            console.error("OpenAI API Error Details:", error.response.data.error.message);
            return `Error communicating with AI: ${error.response.data.error.message}`;
        }
        return `An unexpected error occurred: ${error.message}`;
    }
}
