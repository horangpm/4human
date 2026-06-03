import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function list() {
  try {
    const fetchResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await fetchResponse.json();
    console.log("Models:", data.models.map(m => m.name).join(', '));
  } catch (err) {
    console.error(err);
  }
}
list();
