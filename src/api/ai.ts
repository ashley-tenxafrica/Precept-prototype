import { Router } from "express";
import { GoogleGenAI, Type, FunctionDeclaration, DynamicRetrievalConfig } from "@google/genai";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
import { db, logAuditEvent } from "../db/index";
import { assessmentItems } from "../db/schema";
import { eq } from "drizzle-orm";

export const aiRouter = Router();

// Initialize SDK lazily
let ai: GoogleGenAI | null = null;
function getAI() {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is required");
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
}

// Phase 1: Interview
// We simulate streaming Gen-UI tool commands as JSON lines
aiRouter.post("/chat", async (req, res) => {
  try {
    const { message, history, contextText } = req.body;
    const genai = getAI();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const systemInstruction = `You are PRECEPT, a compliance assessment AI.
Your goal is to assess whether a data processing activity is lawful according to POPIA.
If the user uploads context (like a PDF), use it to understand their processes.
Ask ONE question at a time using Gen-UI tools to build a profile.

Available UI Tools:
- 'free_text': For open-ended questions.
- 'yes_no': For boolean questions.
- 'checkbox_cards': For selecting multiple legal bases (e.g., Consent, Contract, Legal Obligation).

Return your responses as JSON objects ONLY. Do not use markdown blocks.
Format: {"tool": "tool_name", "question": "your question", "options": ["opt1", "opt2"]} // options only if applicable.
    `;

    const contents = [];
    if (contextText) {
      contents.push({ role: 'user', parts: [{ text: `[BACKGROUND CONTEXT]: ${contextText}` }] });
      contents.push({ role: 'model', parts: [{ text: 'Context received. I will use it for the assessment.' }] });
    }
    
    // Add history
    if (history && Array.isArray(history)) {
      history.forEach(m => contents.push(m));
    }
    
    // Add new message
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await ai?.models.generateContentStream({
      model: "gemini-3.1-pro-preview",
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      }
    });

    if (response) {
      for await (const chunk of response) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }
    }
    
    res.end();
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// Phase 2: Extraction
aiRouter.post("/extract", async (req, res) => {
  try {
    const { history, contextText, itemId } = req.body;
    const genai = getAI();

    const systemInstruction = `You are an expert POPIA compliance assessor.
Review the conversation history and any provided context.
Assess the activity based on:
1. Legal Basis (is one claimed and supported?)
2. Section 9 (Processing Limitation - is processing lawful and reasonable?)
3. Section 10 (Minimality - is data collected adequate, relevant, and not excessive?)

Output JSON conforming exactly to the schema.`;

    const contents = [{ role: 'user', parts: [{ text: `History: ${JSON.stringify(history)}. Context: ${contextText || 'None'}. Extract compliance data.` }] }];

    const response = await ai?.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            basis_met: { type: Type.BOOLEAN, description: "True if a valid legal basis is met" },
            s9_met: { type: Type.BOOLEAN, description: "True if Section 9 is met" },
            s10_met: { type: Type.BOOLEAN, description: "True if Section 10 is met" },
            reasoning: { type: Type.STRING, description: "Detailed reasoning for the assessment" },
          },
          required: ["basis_met", "s9_met", "s10_met", "reasoning"]
        }
      }
    });

    const outputText = response?.text;
    if (!outputText) throw new Error("No output from model");
    
    const extraction = JSON.parse(outputText);
    
    // Scorer rules
    // 1+ basis met AND S.9 met AND S.10 met -> High
    // 1 basis met but S.10 borderline -> Reasonable (We define borderline as s9_met=true, s10=false but reasoning is soft. To simplify: if basis && !s10 -> Reasonable or Limited based on s9)
    // Here: 
    // if basis && s9 && s10 -> High
    // if basis && s9 && !s10 -> Reasonable
    // if basis && !s9 && !s10 -> Limited
    // if !basis -> Very Limited
    let assuranceRating = "Very Limited";
    if (extraction.basis_met) {
      if (extraction.s9_met && extraction.s10_met) assuranceRating = "High";
      else if (extraction.s9_met && !extraction.s10_met) assuranceRating = "Reasonable";
      else assuranceRating = "Limited";
    }

    if (itemId) {
      logAuditEvent("System", "item.extraction", "assessment_items", `Extracted data for item ${itemId}`);
    }

    res.json({
      extracted_data: extraction,
      assurance_rating: assuranceRating
    });
  } catch (error: any) {
    console.error("AI Extraction Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Phase 3: Context Injection
aiRouter.post("/upload", async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    const data = await pdf(req.file.buffer);
    
    logAuditEvent("System", "context.injected", "pdf_upload", `Uploaded ${req.file.originalname}`);

    res.json({
      text: data.text,
      pages: data.numpages
    });
  } catch (error: any) {
    console.error("PDF Parsing Error:", error);
    res.status(500).json({ error: error.message });
  }
});
