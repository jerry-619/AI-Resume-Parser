const express = require("express");
const multer = require("multer");
const path = require("path");
const { batchUploadResumes, aiScoreResumes } = require("../controllers/resumeController");

const router = express.Router();

// ✅ Proper Multer Storage Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

router.post("/batch-upload", upload.array("resumes"), (req, res) => {
  // Add modelType to the request body
  req.body.modelType = req.body.modelType || 'gemini';
  batchUploadResumes(req, res);
});

router.post("/ai-score", upload.array("resumes"), (req, res) => {
  req.body.modelType = req.body.modelType || 'gemini';
  aiScoreResumes(req, res);
});

module.exports = router;
