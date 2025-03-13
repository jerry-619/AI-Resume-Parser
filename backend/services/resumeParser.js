const fs = require("fs");
const pdf = require("pdf-parse");
const mammoth = require("mammoth");
const tesseract = require("node-tesseract-ocr");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { OpenAI } = require("openai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize OpenAI client with beta configuration
const openai = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY
});

// OCR configuration for images
const ocrConfig = {
  lang: "eng",
  oem: 1,
  psm: 3,
};

async function extractTextFromResume(filePath) {
  const fileExtension = path.extname(filePath).toLowerCase();
  
  try {
    switch (fileExtension) {
      case ".pdf":
        return await extractFromPDF(filePath);
      case ".docx":
        return await extractFromDOCX(filePath);
      case ".png":
      case ".jpg":
      case ".jpeg":
        return await extractFromImage(filePath);
      default:
        throw new Error("Unsupported file format");
    }
  } catch (error) {
    console.error(`Error extracting text from ${filePath}:`, error);
    throw error;
  }
}

async function extractFromPDF(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);
  return data.text;
}

async function extractFromDOCX(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

async function extractFromImage(filePath) {
  const text = await tesseract.recognize(filePath, ocrConfig);
  return text;
}

async function parseResumeWithGemini(resumeText) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192
      }
    });

    const prompt = `
      You are an AI resume parser. Analyze this resume text and extract the following information in a structured format:
      1. Full name
      2. Email address
      3. Phone number
      4. Post applied for (look for job title, desired position, or career objective)
      5. Highest education qualification only (pick the most recent or highest degree)
      6. Work experience (including company, position, duration, and key responsibilities)

      For work experience durations, please format them consistently as follows:
      - If it's a specific duration: "X years Y months" (e.g., "2 years 6 months")
      - If it's ongoing: "Start Year - Present" (e.g., "2021 - Present")
      - If only years are available: "X years" (e.g., "3 years")
      - If only months are available: "Y months" (e.g., "6 months")

      For post applied for:
      - Look for explicit mentions like "Applying for", "Position Sought", "Career Objective"
      - If not found, infer from recent experience or skills
      - If still unclear, use "Not Specified"

      For highest education:
      - Pick only the highest degree (e.g., if both Bachelor's and Master's are present, only include Master's)
      - Consider the following order: PhD > Master's > Bachelor's > Diploma > Certificate
      - Include only one education entry

      Resume text:
      """
      ${resumeText}
      """

      Return the data in this exact JSON format (no additional text or explanation):
      {
        "fullName": "string",
        "email": "string",
        "phone": "string",
        "postAppliedFor": "string",
        "education": {
          "degree": "string",
          "institution": "string",
          "year": "string"
        },
        "experience": [
          {
            "company": "string",
            "position": "string",
            "duration": "string",
            "responsibilities": ["string"]
          }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      // Remove any markdown formatting and parse JSON
      const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanText);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", text);
      throw new Error("Invalid JSON response from Gemini");
    }
  } catch (error) {
    console.error("Error parsing resume with Gemini:", error);
    if (error.message.includes("NOT_FOUND")) {
      throw new Error("Invalid Gemini API key or model not available");
    }
    throw new Error("Failed to parse resume: " + error.message);
  }
}

async function parseResumeWithGPT4(resumeText) {
  try {
    const response = await openai.chat.completions.create({
      model: process.env.CHATGPT_MODEL,
      messages: [{
        role: 'user',
        content: `
          You are an AI resume parser. Analyze this resume text and extract the following information in a structured format:
          1. Full name
          2. Email address
          3. Phone number
          4. Post applied for (look for job title, desired position, or career objective)
          5. Highest education qualification only (pick the most recent or highest degree)
          6. Work experience (including company, position, duration, and key responsibilities)

          Resume text:
          """
          ${resumeText}
          """

          Return the data in this exact JSON format (no additional text or explanation):
          {
            "fullName": "string",
            "email": "string",
            "phone": "string",
            "postAppliedFor": "string",
            "education": {
              "degree": "string",
              "institution": "string",
              "year": "string"
            },
            "experience": [
              {
                "company": "string",
                "position": "string",
                "duration": "string",
                "responsibilities": ["string"]
              }
            ]
          }
        `
      }],
      temperature: 0.1,
      max_tokens: 2000
    });

    // Clean the response text by removing markdown formatting
    const cleanText = response.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();

    // Parse the cleaned JSON text
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Error parsing resume with GPT-4:", error);
    throw new Error("Failed to parse resume with GPT-4. Please check the model name and API configuration.");
  }
}

async function parseResumeWithDeepSeek(resumeText) {
  let response;
  try {
    response = await openai.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL,
      messages: [{
        role: 'user',
        content: `
          You are an AI resume parser. Analyze this resume text and extract the following information:
          1. Full name
          2. Email address
          3. Phone number
          4. Post applied for (look for job title, desired position, or career objective)
          5. Highest education qualification
          6. Work experience

          Return ONLY the data in this exact JSON format:
          {
            "fullName": "string",
            "email": "string",
            "phone": "string",
            "postAppliedFor": "string",
            "education": {
              "degree": "string",
              "institution": "string",
              "year": "string"
            },
            "experience": [
              {
                "company": "string",
                "position": "string",
                "duration": "string",
                "responsibilities": ["string"]
              }
            ]
          }

          Resume text:
          """${resumeText}"""
        `
      }],
      temperature: 0.1,
      max_tokens: 2000
    });

    const responseText = response.choices[0].message.content;

    // Enhanced JSON extraction
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}') + 1;
    const jsonString = responseText.slice(jsonStart, jsonEnd);

    // Clean and validate JSON
    const cleanText = jsonString
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .replace(/<[^>]*>/g, "")
      .replace(/[""]/g, '"')
      .trim();

    try {
      const parsed = JSON.parse(cleanText);
      
      // Add validation for required fields with fallback values
      return {
        fullName: parsed.fullName || "",
        email: parsed.email || "",
        phone: parsed.phone || "",
        postAppliedFor: parsed.postAppliedFor || "",
        education: parsed.education || { 
          degree: "", 
          institution: "", 
          year: "" 
        },
        experience: Array.isArray(parsed.experience) ? 
          parsed.experience.map(exp => ({
            company: exp.company || "",
            position: exp.position || "",
            duration: exp.duration || "N/A",
            responsibilities: Array.isArray(exp.responsibilities) ? 
              exp.responsibilities : []
          })) : []
      };
    } catch (parseError) {
      console.error("Invalid DeepSeek JSON:", cleanText);
      throw new Error("Malformed JSON from DeepSeek");
    }
  } catch (error) {
    console.error("DeepSeek parsing error:", error);
    console.error("Raw response:", response?.choices[0]?.message?.content);
    throw new Error("Failed to parse with DeepSeek");
  }
}

async function parseResumeWithLlama(resumeText) {
  let response;
  try {
    response = await openai.chat.completions.create({
      model: process.env.LLAMA_MODEL,
      messages: [{
        role: 'user',
        content: `
          You are an AI resume parser. Analyze this resume text and extract the following information:
          1. Full name
          2. Email address
          3. Phone number
          4. Post applied for
          5. Highest education qualification
          6. Work experience

          Return ONLY the data in this exact JSON format:
          {
            "fullName": "string",
            "email": "string",
            "phone": "string",
            "postAppliedFor": "string",
            "education": {
              "degree": "string",
              "institution": "string",
              "year": "string"
            },
            "experience": [
              {
                "company": "string",
                "position": "string",
                "duration": "string",
                "responsibilities": ["string"]
              }
            ]
          }

          Resume text:
          """${resumeText}"""
        `
      }],
      temperature: 0.1,
      max_tokens: 2000
    });

    const responseText = response.choices[0].message.content;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.error("No JSON found in Llama response:", responseText);
      throw new Error("Invalid response format from Llama");
    }

    const cleanText = jsonMatch[0]
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .replace(/<[^>]*>/g, "")
      .replace(/[""]/g, '"')
      .trim();

    try {
      return JSON.parse(cleanText);
    } catch (parseError) {
      console.error("Invalid Llama JSON:", cleanText);
      throw new Error("Malformed JSON from Llama");
    }
  } catch (error) {
    console.error("Llama parsing error:", error);
    console.error("Raw response:", response?.choices[0]?.message?.content);
    throw new Error("Failed to parse with Llama");
  }
}

module.exports = {
  extractTextFromResume,
  parseResumeWithGemini,
  parseResumeWithGPT4,
  parseResumeWithDeepSeek,
  parseResumeWithLlama
};