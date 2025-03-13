const { 
  extractTextFromResume,
  parseResumeWithGemini,
  parseResumeWithGPT4, 
  parseResumeWithDeepSeek,
  parseResumeWithLlama
} = require("../services/resumeParser");

const aiScoring = require("../services/aiScoring");
const {
  getGeminiResumeScore,
  getGPT4ResumeScore,
  getDeepSeekResumeScore,
  getLlamaResumeScore
} = aiScoring;
const checkPositionMatch = aiScoring.checkPositionMatch;

const { matchKeywords } = require("../services/keywordMatcher");
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Rate limiting configuration
const RATE_LIMIT = 12; // resumes per minute
const BATCH_SIZE = 4; // process 4 resumes at a time
const BATCH_DELAY = Math.floor(60000 / (RATE_LIMIT / BATCH_SIZE)); // delay between batches in ms

// Function to process a batch of resumes
async function processBatch(files, startIndex, results, errors, modelType, jobDescription) {
  const batch = files.slice(startIndex, startIndex + BATCH_SIZE);
  const batchPromises = batch.map(async (file) => {
    try {
      console.log(`Processing file: ${file.originalname}`);
      const extractedText = await extractTextFromResume(file.path);
      let parsedResume;
      
      switch (modelType) {
        case 'gpt4':
          parsedResume = await parseResumeWithGPT4(extractedText);
          break;
        case 'deepseek':
          parsedResume = await parseResumeWithDeepSeek(extractedText);
          break;
        case 'llama':
          parsedResume = await parseResumeWithLlama(extractedText);
          break;
        default:
          parsedResume = await parseResumeWithGemini(extractedText);
      }
      
      // Calculate total experience
      const totalExperience = calculateTotalExperience(parsedResume.experience);
      
      const aiScore = await (modelType === 'gpt4' ? getGPT4ResumeScore :
                            modelType === 'deepseek' ? getDeepSeekResumeScore :
                            modelType === 'llama' ? getLlamaResumeScore :
                            getGeminiResumeScore)(extractedText, jobDescription);
      
      // Add position match validation
      const positionMatch = checkPositionMatch(
        parsedResume.postAppliedFor || '', 
        jobDescription || ''
      );
      
      results.push({
        fileName: file.originalname,
        ...parsedResume,
        totalExperience: totalExperience.formatted,
        aiScore: aiScore.aiScore,
        modelType: modelType,
        positionMatch: positionMatch || aiScore.positionMatch // Combine both checks
      });
      console.log(`Successfully parsed: ${file.originalname}`);
    } catch (error) {
      console.error(`Error processing ${file.originalname}:`, error);
      errors.push({
        fileName: file.originalname,
        error: error.message || "Failed to parse resume"
      });
      throw error;
    } finally {
      // Clean up uploaded file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }
  });

  await Promise.all(batchPromises);
}

// Function to calculate total experience in years and months
function calculateTotalExperience(experience) {
  let totalMonths = 0;

  // Handle null or undefined experience
  if (!experience || !Array.isArray(experience) || experience.length === 0) {
    return {
      years: 0,
      months: 0,
      formatted: '0 years 0 months'
    };
  }

  experience.forEach(exp => {
    if (!exp || !exp.duration) return; // Skip if experience entry or duration is missing
    
    const duration = exp.duration.toLowerCase();
    
    // Extract years and months from duration string
    const yearsMatch = duration.match(/(\d+)\s*(?:year|yr|y)/);
    const monthsMatch = duration.match(/(\d+)\s*(?:month|mo|m)/);
    
    if (yearsMatch) {
      totalMonths += parseInt(yearsMatch[1]) * 12;
    }
    if (monthsMatch) {
      totalMonths += parseInt(monthsMatch[1]);
    }
    
    // Handle present/current job
    if (duration.includes('present') || duration.includes('current')) {
      const startYearMatch = duration.match(/(\d{4})/);
      if (startYearMatch) {
        const startYear = parseInt(startYearMatch[1]);
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        totalMonths += (currentYear - startYear) * 12 + currentMonth;
      }
    }
  });

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  return {
    years,
    months,
    formatted: `${years} year${years !== 1 ? 's' : ''} ${months} month${months !== 1 ? 's' : ''}`
  };
}

exports.batchUploadResumes = async (req, res) => {
  try {
    const modelType = req.body.modelType || 'gemini';
    
    console.log('Batch upload request received');
    console.log('Files:', req.files ? req.files.length : 'No files');
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const results = [];
    const errors = [];
    const totalFiles = req.files.length;

    // Process resumes in batches with rate limiting
    for (let i = 0; i < totalFiles; i += BATCH_SIZE) {
      await processBatch(req.files, i, results, errors, modelType);
      
      // Agar koi error aaye toh process stop karo
      if (errors.length > 0) {
        return res.status(400).json({ 
          error: "Failed to process some resumes",
          errors: errors 
        });
      }
      
      // If there are more files to process, wait before the next batch
      if (i + BATCH_SIZE < totalFiles) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }

    // Agar koi error aaya hai toh Excel file create mat karo
    if (errors.length > 0) {
      return res.status(400).json({ 
        error: "Failed to process some resumes",
        errors: errors 
      });
    }

    // Generate Excel file
    const wb = xlsx.utils.book_new();
    
    // Convert parsed data to rows with specific column order
    const rows = results.map(resume => {
      // Format education data
      const educationFormatted = resume.education
        ? `${resume.education.degree || 'Degree'}\nInstitution: ${resume.education.institution || 'N/A'}\nYear: ${resume.education.year || 'N/A'}`
        : '';

      // Format experience data with bullets
      const experienceFormatted = Array.isArray(resume.experience)
        ? resume.experience.map(exp => {
            const responsibilities = Array.isArray(exp.responsibilities)
              ? exp.responsibilities.map(resp => `    • ${resp}`).join('\n')
              : '';
            
            return `• ${exp.position || 'Position'} at ${exp.company || 'Company'}\n  Duration: ${exp.duration || 'N/A'}\n  Responsibilities:\n${responsibilities}`;
          }).join('\n\n')
        : '';

      return {
        'File Name': resume.fileName || ' ',
        'Full Name': resume.fullName || '',
        'Email': resume.email || '',
        'Phone': resume.phone || '',
        'Post Applied For': resume.postAppliedFor || 'Not Specified',
        'Total Experience': resume.totalExperience || '0 years 0 months',
        'Education': educationFormatted,
        'Experience': experienceFormatted
      };
    });

    // Create worksheet with specific column order
    const ws = xlsx.utils.json_to_sheet(rows, {
      header: [
        'File Name',
        'AI Score',
        'Full Name',
        'Email',
        'Phone',
        'Post Applied For',
        'Total Experience',
        'Education',
        'Experience'
      ]
    });

    // Set column widths
    ws['!cols'] = [
      { wch: 30 }, // File Name
      { wch: 15 }, // AI Score
      { wch: 25 }, // Full Name
      { wch: 35 }, // Email
      { wch: 15 }, // Phone
      { wch: 25 }, // Post Applied For
      { wch: 20 }, // Total Experience
      { wch: 50 }, // Education
      { wch: 100 }  // Experience
    ];

    // Set row heights (make them taller to accommodate multiple lines)
    const rowCount = rows.length + 1; // +1 for header
    ws['!rows'] = Array(rowCount).fill({ hpt: 30 }); // Set default height for all rows

    // Style the cells for better readability
    for (let i = 0; i < rowCount; i++) {
      const rowRef = i + 1; // Excel rows are 1-based
      // Apply to Education column
      const eduCell = xlsx.utils.encode_cell({ r: i, c: 5 }); // Education is column F (index 5)
      if (ws[eduCell]) {
        ws[eduCell].s = {
          alignment: { wrapText: true, vertical: 'top' },
          font: { name: 'Arial', sz: 11 }
        };
      }
      // Apply to Experience column
      const expCell = xlsx.utils.encode_cell({ r: i, c: 6 }); // Experience is column G (index 6)
      if (ws[expCell]) {
        ws[expCell].s = {
          alignment: { wrapText: true, vertical: 'top' },
          font: { name: 'Arial', sz: 11 }
        };
      }
    }

    // Add worksheet to workbook
    xlsx.utils.book_append_sheet(wb, ws, 'Parsed Resumes');

    // If there are errors, add error sheet
    if (errors.length > 0) {
      const errorWs = xlsx.utils.json_to_sheet(errors);
      xlsx.utils.book_append_sheet(wb, errorWs, 'Errors');
    }

    console.log('Generating Excel file');
    const excelBuffer = xlsx.write(wb, { 
      type: 'buffer',
      bookType: 'xlsx',
      cellStyles: true
    });

    // Send both Excel file and results data
    res.json({
      excelData: excelBuffer.toString('base64'),
      results: results
    });
  } catch (error) {
    console.error("Error in batch upload:", error);
    res.status(500).json({ error: error.message || "Failed to process resumes" });
  }
};

exports.aiScoreResumes = async (req, res) => {
  try {
    const modelType = req.body.modelType || 'gemini';
    const jobDescription = req.body.jobDescription;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const results = [];
    const errors = [];
    const totalFiles = req.files.length;

    // Process resumes in batches (same as before but without Excel generation)
    for (let i = 0; i < totalFiles; i += BATCH_SIZE) {
      await processBatch(req.files, i, results, errors, modelType, jobDescription);
      if (errors.length > 0) break;
    }

    if (errors.length > 0) {
      return res.status(400).json({ 
        error: "Failed to process some resumes",
        errors: errors 
      });
    }

    res.json(results);
  } catch (error) {
    console.error("Error in AI scoring:", error);
    res.status(500).json({ error: error.message || "Failed to score resumes" });
  }
};