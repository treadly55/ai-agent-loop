import OpenAI from "openai";

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
    console.error("OpenAI API key is missing. Make sure VITE_OPENAI_API_KEY is set in your .env file.");
}

export const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true 
});