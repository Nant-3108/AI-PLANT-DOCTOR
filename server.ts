import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Lazy-initialized Gemini Client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is not configured. Please add your API key in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support up to 15MB Base64 uploads to cover high-res plant leaves
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ limit: '15mb', extended: true }));

  // API Route: Diagnose
  app.post("/api/diagnose", async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { image, mimeType } = req.body;

      if (!image) {
        return res.status(400).json({ error: "No image provided" });
      }

      const client = getGeminiClient();

      const imagePart = {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: image,
        },
      };

      const promptPart = `You are a professional agricultural plant pathologist & expert Plant Doctor.
Analyze this uploaded image and complete the following verification steps:
1. Confirm if a plant leaf is present in the image.
2. Evaluate the leaf for explicit visual symptoms of disease, pests, infestation, or nutrient deficiencies.
3. Strict Constraint 1: If a plant leaf is present but is completely healthy, you MUST bypass all other instructions and respond ONLY with the exact phrase: "No disease found". Do not guess or hallucinate symptoms.
4. Strict Constraint 2: If there is no sign of a leaf in the image (e.g., the image contains an inanimate object, animal, person, cup, keyboard, notebook, desk, text, logo, etc.), you MUST identify the main object, and respond ONLY with the exact phrase containing the identified object name in double quotes, in this format: "Name of the object" No leaf found
For example:
- If the image contains a coffee mug, respond ONLY with: "Coffee mug" No leaf found
- If the image contains a cat, respond ONLY with: "Cat" No leaf found
- If the image contains a keyboard, respond ONLY with: "Computer keyboard" No leaf found

If a disease or pathology is explicitly found on a plant leaf, output the analysis using the following EXACT Markdown structure:

## Diagnosis: [Insert Disease Name]
**Confidence Level:** [High/Medium/Low]

### 📋 Overview & Symptoms
- **Visual Evidence:** [Briefly describe the symptoms observed in the image that led to this diagnosis]
- **Cause:** [Pathogen type: Fungal, Bacterial, Viral, or Pest]

### 🛠️ Treatment Plan
#### 1. Immediate Actions (Cultural/Physical Controls)
- [Action step 1]
- [Action step 2]

#### 2. Chemical/Organic Treatments
- [Recommended organic remedies or chemical controls, if applicable]

### 🚫 Prevention & Care
- [Provide 2-3 tips to prevent recurrence, e.g., watering habits, sunlight, spacing]

Behavioral & Tone Constraints:
- Tone: Professional, empathetic, actionable, and scientifically accurate.
- Safety First: If recommending chemical pesticides, include a brief standard warning to handle with care and follow local regulations.
- No filler text, conversational intro or outro. Start directly with the markdown headers (e.g. ## Diagnosis: ...) if a disease is found, or "No disease found" / "[ObjectName] No leaf found" depending on visual inputs.`;

      // Resilience Retry Wrapper with Exponential Backoff
      let response;
      let attempt = 0;
      const maxAttempts = 4;
      const initialDelayMs = 1200;

      const textPart = {
        text: promptPart,
      };

      while (true) {
        try {
          attempt++;
          response = await client.models.generateContent({
            model: "gemini-3.5-flash",
            contents: [imagePart, textPart],
          });
          break; // success
        } catch (error: any) {
          const errorStr = String(error?.message || error || "");
          const isRetryable = error?.status === 503 || 
                              error?.status === 429 || 
                              error?.status === 408 ||
                              errorStr.includes("503") || 
                              errorStr.includes("429") || 
                              errorStr.includes("UNAVAILABLE") ||
                              errorStr.includes("demand");
          
          if (attempt >= maxAttempts || !isRetryable) {
            console.error(`Gemini API permanently failed after ${attempt} attempts.`);
            throw error;
          }

          const delay = initialDelayMs * Math.pow(2, attempt - 1) + Math.random() * 400;
          console.warn(`Gemini API experiencing transient stress (Attempt ${attempt}/${maxAttempts}). Retrying in ${Math.round(delay)}ms. Error info: ${errorStr}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      const text = response.text || "";
      const trimmedText = text.trim();

      // Check for clean match
      const lowerText = trimmedText.toLowerCase();
      const isNoDisease = lowerText === "no disease found" || 
                          lowerText.includes("no disease found") && !lowerText.includes("## diagnosis:") ||
                          trimmedText.startsWith("No disease found");

      const isNoLeaf = lowerText.includes("no leaf found") && !lowerText.includes("## diagnosis:");

      let diagnosisName = "No disease found";
      let confidence: 'High' | 'Medium' | 'Low' | null = null;
      let isDiseased = false;

      if (isNoLeaf) {
        // Keeps format e.g. "Coffee mug" No leaf found
        diagnosisName = trimmedText;
        isDiseased = false;
        confidence = "High";
      } else if (isNoDisease) {
        diagnosisName = "No disease found";
        isDiseased = false;
      } else {
        isDiseased = true;
        // Parse the diagnosis name from markdown: "## Diagnosis: [Insert Name]"
        const diagMatch = trimmedText.match(/## Diagnosis:\s*(.+)/i);
        if (diagMatch && diagMatch[1]) {
          diagnosisName = diagMatch[1].replace(/\[|\]/g, "").trim();
        } else {
          diagnosisName = "Unknown Plant Infection";
        }

        // Parse confidence: "**Confidence Level:** [High/Medium/Low]"
        const confMatch = trimmedText.match(/\*\*Confidence Level:\*\*\s*(High|Medium|Low)/i);
        if (confMatch && confMatch[1]) {
          confidence = confMatch[1].trim() as 'High' | 'Medium' | 'Low';
        } else {
          confidence = "Medium";
        }
      }

      return res.json({
        diagnosis: diagnosisName,
        confidence,
        rawMarkdown: trimmedText,
        isDiseased,
      });

    } catch (error: any) {
      console.error("Gemini API error:", error);
      return res.status(500).json({ error: error.message || "Failed to make diagnosis. Is the Gemini API key configured correctly?" });
    }
  });

  // Serve static application
  let viteInstance: any = null;
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    viteInstance = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : {
          clientPort: 443,
        },
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: "spa",
    });
    app.use(viteInstance.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  if (viteInstance) {
    server.on('upgrade', (req, socket, head) => {
      if (viteInstance.ws) {
        viteInstance.ws.handleUpgrade(req, socket, head);
      }
    });
  }
}

startServer();
