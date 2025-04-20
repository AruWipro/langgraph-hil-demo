import { RunnableConfig } from "@langchain/core/runnables";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import dotenv from 'dotenv';
dotenv.config();
// Initialize Google GenAI model
// Add Langsmith tracing  
import { wrapSDK } from 'langsmith/wrappers';
const API_KEY = process.env.GOOGLE_API_KEY
export const llm = (config:RunnableConfig) => wrapSDK(new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash",
  maxOutputTokens: 150,
  apiKey: API_KEY,
  verbose:false,
  temperature:0.6,
}),{metadata: {session_id: config.configurable?.thread_id}});