import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function list() {
  try {
    const fetchResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await fetchResponse.json();
    console.log(JSON.stringify(data.models?.map(m => m.name), null, 2));
  } catch(e) {
    console.error(e);
  }
}
list();
