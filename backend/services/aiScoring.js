const { GoogleGenerativeAI } = require("@google/generative-ai");
const { OpenAI } = require("openai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const openai = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY
});

const cleanAIResponse = (text) => {
  // Extract JSON using more robust pattern matching
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return text;
  
  return jsonMatch[0]
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();
};

const checkPositionMatch = (resumePosition, jobDescription) => {
  if (!resumePosition || !jobDescription) return false;
  const resumeKeywords = resumePosition.toLowerCase().split(/[\s,\/]+/);
  const jobKeywords = jobDescription.toLowerCase().split(/[\s,\/]+/);
  return jobKeywords.some(kw => resumeKeywords.includes(kw));
};

exports.getGeminiResumeScore = async (resumeText, jobDescription) => {
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
      You are a resume evaluator. Analyze how well this resume matches the position 
      the candidate is applying for. Consider these aspects:
      
      1. Position Match: Is the resume clearly targeting the given position?
      2. Relevant Experience: Does it show related work history?
      3. Education: Appropriate degrees/certifications for the role
      4. Skills: Required technical/professional capabilities
      5. Overall Alignment: General suitability for the position.

      Position Being Applied For: """${jobDescription}"""
      Resume Content: """${resumeText}"""

      **Response Format (Strict JSON):**
      {
        "aiScore": number (0-100),
        "positionMatch": boolean,
        "matchReasons": ["3-5 key reasons it's a good fit"],
        "mismatchReasons": ["3-5 key gaps if not matching"]
      }

      Rules:
      1. Score should reflect position alignment, not general quality
      2. Give specific examples from resume content
      3. Focus on role-specific requirements
      4. Never return empty arrays
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanText);
      
      // Validation check
      if (!parsed.matchReasons?.length || !parsed.mismatchReasons?.length) {
        console.error("Validation Failed for Gemini Response:", parsed);
        throw new Error("Gemini response missing required reasons arrays");
      }

      return {
        aiScore: parsed.aiScore || 0,
        positionMatch: parsed.positionMatch || false,
        matchReasons: parsed.matchReasons || [],
        mismatchReasons: parsed.mismatchReasons || []
      };
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", text);
      throw new Error("Invalid JSON response from Gemini");
    }
  } catch (error) {
    console.error("❌ Gemini AI Scoring Error. :", error);
    throw new Error("Failed to generate AI resume score with Gemini");
  }
};

exports.getGPT4ResumeScore = async (resumeText, jobDescription) => {
  try {
    const response = await openai.chat.completions.create({
      model: process.env.CHATGPT_MODEL,
      messages: [{
        role: 'user',
        content: `
          Analyze resume for: ${jobDescription}
          Resume Target Position: ${resumeData.postAppliedFor}
          Return STRICT JSON format:
          {
            "aiScore": 0-100,
            "positionMatch": ${checkPositionMatch(resumeData.postAppliedFor, jobDescription)},
            "matchReasons": ["3-5 specific matching points from resume"],
            "mismatchReasons": ["3-5 specific missing requirements."]
          }

          Rules:
          1. positionMatch=true only if job title exists AND score > 65
          2. Never use placeholder text - be specific
          3. Use exact field names
          4. Minimum 3 items in each reasons array
        `
      }]
    });

    const rawText = response.choices[0].message.content;
    const cleanText = cleanAIResponse(rawText);
    
    try {
      const result = JSON.parse(cleanText);
      
      // Validation check
      if (!result.matchReasons?.length || !result.mismatchReasons?.length) {
        console.error("GPT-4 Response Validation Failed:", result);
        throw new Error("GPT-4 response missing required reasons arrays");
      }

      return {
        aiScore: result.aiScore,
        positionMatch: result.positionMatch,
        matchReasons: result.matchReasons,
        mismatchReasons: result.mismatchReasons
      };
    } catch (parseError) {
      console.error("GPT-4 Response Parsing Failed. Raw response:", rawText);
      throw new Error("Invalid JSON format from GPT-4");
    }
  } catch (error) {
    console.error("GPT-4 Scoring Error:", error);
    throw new Error("Failed to score with GPT-4");
  }
};

exports.getDeepSeekResumeScore = async (resumeText, jobDescription) => {
  try {
    const response = await openai.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL,
      messages: [{
        role: 'user',
        content: `
          Analyze resume suitability for position:
          Position: """${jobDescription}"""
          Resume: """${resumeText}"""
          
          Return STRICT JSON with:
          {
            "aiScore": 0-100,
            "positionMatch": boolean,
            "matchReasons": ["3 specific matching points"],
            "mismatchReasons": ["3 specific gaps"]
          }

          Rules:
          1. Never use markdown formatting
          2. Use only plain JSON format
          3. Ensure valid JSON syntax
          4. Include at least 3 items in each reasons array
        `
      }]
    });

    const rawText = response.choices[0].message.content;
    const cleanText = cleanAIResponse(rawText);
    
    try {
      const result = JSON.parse(cleanText);
      
      // Validation check
      if (!result.matchReasons?.length || !result.mismatchReasons?.length) {
        console.error("Validation Failed for DeepSeek Response:", result);
        throw new Error("DeepSeek response missing required reasons arrays");
      }

      return {
        aiScore: result.aiScore,
        positionMatch: result.positionMatch,
        matchReasons: result.matchReasons.slice(0, 3),  // Get top 3 reasons
        mismatchReasons: result.mismatchReasons.slice(0, 3)
      };
    } catch (parseError) {
      console.error("DeepSeek Response Parsing Failed. Raw response:", rawText);
      throw new Error("Invalid JSON format from DeepSeek");
    }
  } catch (error) {
    console.error("DeepSeek Scoring Error:", error);
    throw new Error("Failed to score with DeepSeek");
  }
};

exports.getLlamaResumeScore = async (resumeText, jobDescription) => {
  try {
    const response = await openai.chat.completions.create({
      model: process.env.LLAMA_MODEL,
      messages: [{
        role: 'user',
        content: `
          Analyze resume suitability for position:
          Position: """${jobDescription}"""
          Resume: """${resumeText}"""
          
          Return ONLY JSON with:
          {
            "aiScore": 0-100,
            "positionMatch": boolean,
            "matchReasons": ["string"],
            "mismatchReasons": ["string"]
          }
        `
      }]
    });

    const rawText = response.choices[0].message.content;
    const cleanText = cleanAIResponse(rawText);
    
    try {
      const result = JSON.parse(cleanText);
      
      // Validation check
      if (!result.matchReasons?.length || !result.mismatchReasons?.length) {
        console.error("Validation Failed for Llama Response:", result);
        throw new Error("Llama response missing required reasons arrays");
      }

      return {
        aiScore: result.aiScore || 0,
        positionMatch: result.positionMatch || false,
        matchReasons: result.matchReasons || [],
        mismatchReasons: result.mismatchReasons || []
      };
    } catch (parseError) {
      console.error("Llama Response Parsing Failed. Raw response:", rawText);
      throw new Error(`Invalid JSON format from Llama: ${parseError.message}`);
    }
  } catch (error) {
    console.error("Llama Scoring Error:", error);
    throw new Error("Failed to score with Llama");
  }
};

exports.checkPositionMatch = (resumePosition, jobDescription) => {
  if (!resumePosition || !jobDescription) return false;
  const resumeKeywords = resumePosition.toLowerCase().split(/[\s,\/]+/);
  const jobKeywords = jobDescription.toLowerCase().split(/[\s,\/]+/);
  return jobKeywords.some(kw => resumeKeywords.includes(kw));
};
