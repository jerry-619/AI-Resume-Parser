const natural = require("natural");

exports.matchKeywords = (resumeText, jobDesc) => {
  const tokenizer = new natural.WordTokenizer();
  const resumeWords = tokenizer.tokenize(resumeText.toLowerCase());
  const jobWords = tokenizer.tokenize(jobDesc.toLowerCase());

  const matchedSkills = jobWords.filter((word) => resumeWords.includes(word));

  return {
    score: (matchedSkills.length / jobWords.length) * 100,
    matchedSkills,
  };
};
