import React, { useState, useCallback } from 'react';
import { 
  Container, 
  Paper, 
  Typography, 
  Box,
  Button,
  CircularProgress,
  Alert,
  Theme,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  IconButton,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Delete } from '@mui/icons-material';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AIScoringPage from './AIScoringPage';

// Add this new keyframe animation at the top after imports
const rgbBorder = `
  @keyframes rgb-border {
    0% { border-color: rgba(255, 0, 0, 0.3); }
    33% { border-color: rgba(0, 255, 0, 0.3); }
    66% { border-color: rgba(0, 0, 255, 0.3); }
    100% { border-color: rgba(255, 0, 0, 0.3); }
  }
`;

// Add the keyframe to the document
const style = document.createElement('style');
style.textContent = rgbBorder;
document.head.appendChild(style);

const UploadContainer = styled(Paper)(({ theme }: { theme: Theme }) => ({
  padding: theme.spacing(4),
  marginTop: theme.spacing(4),
  textAlign: 'center',
  minHeight: '300px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  backdropFilter: 'blur(12px)',
  borderRadius: '18px',
  boxShadow: '0 8px 32px rgba(255, 255, 255, 0.58)',
  border: '5px solid ',
  animation: 'rgb-border 10s linear infinite',
  position: 'relative',
  cursor: 'pointer',
  width: '100%',
  maxWidth: '95%',
  margin: '20px auto',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
    borderRadius: '24px',
    background: 'inherit',
    backdropFilter: 'blur(12px)',
  },
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
    marginTop: theme.spacing(2),
    minHeight: '250px',
    border: '3px solid',
    borderRadius: '12px',
    '&::before': {
      borderRadius: '12px',
    }
  }
}));

const DragActiveContainer = styled(UploadContainer)({
  borderColor: '#2196f3',
  backgroundColor: 'rgba(33, 150, 243, 0.1)',
  '&::before': {
    background: 'rgba(33, 150, 243, 0.05)'
  }
});

const Input = styled('input')({
  display: 'none'
});

interface ResumeData {
  fullName: string;
  email: string;
  phone: string;
  education: {
    degree: string;
    institution: string;
    year: string;
  }[];
  experience: {
    company: string;
    position: string;
    duration: string;
    responsibilities: string[];
  }[];
}

// Custom styled button
const CustomButton = styled(Button)({
  backgroundColor: '#3498db',
  '&:hover': {
    backgroundColor: '#2980b9',
  },
  borderRadius: '12px',
  padding: '12px 24px',
  textTransform: 'none',
});

function App() {
  return (
    <Router>
      <Container maxWidth={false} disableGutters>
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'center',
          gap: 3,
          p: 2,
           background: 'linear-gradient(135deg, #E0EAFC 20%, #CFDEF3 80%)',
        }}>
          <Button component={Link} to="/" variant="contained">
            Resume Parser
          </Button>
          <Button component={Link} to="/ai-scoring" variant="contained">
            AI Scoring
          </Button>
        </Box>

        <Routes>
          <Route path="/" element={<MainParser />} />
          <Route path="/ai-scoring" element={<AIScoringPage />} />
        </Routes>
      </Container>
    </Router>
  );
}

function MainParser() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [modelType, setModelType] = useState<'gemini' | 'gpt4' | 'deepseek'>('gemini');
  const [parsedResults, setParsedResults] = useState<Array<any>>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const validFiles = Array.from(e.target.files).filter(file => {
        const fileType = file.type.toLowerCase();
        return fileType === 'application/pdf' || 
               fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
               fileType === 'image/png' ||
               fileType === 'image/jpeg';
      });

      if (validFiles.length === 0) {
        setError('Please upload PDF, DOCX, PNG or JPG files only');
        return;
      }

      setFiles(prevFiles => [...prevFiles, ...validFiles]);
      setError(null);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    
    const validFiles = Array.from(e.dataTransfer.files).filter(file => {
      const fileType = file.type.toLowerCase();
      return fileType === 'application/pdf' || 
             fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
             fileType === 'image/png' ||
             fileType === 'image/jpeg';
    });

    if (validFiles.length === 0) {
      setError('Please upload PDF, DOCX, PNG or JPG files only');
      return;
    }

    setFiles(prevFiles => [...prevFiles, ...validFiles]);
    setError(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const removeFile = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(0);
    setProcessingStatus('Starting upload...');

    const formData = new FormData();
    files.forEach(file => {
      formData.append('resumes', file);
    });
    formData.append('modelType', modelType);

    try {
      // Update progress based on upload start
      setProgress(5);
      setProcessingStatus(`Uploading ${files.length} files...`);

      const response = await fetch('http://localhost:3000/api/resume/batch-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.errors) {
          // Agar multiple errors hain toh unhe display karo
          const errorMessages = errorData.errors.map((err: any) => 
            `${err.fileName}: ${err.error}`
          ).join('\n');
          throw new Error(errorMessages);
        } else {
          throw new Error(errorData.error || `Upload failed with status ${response.status}`);
        }
      }

      // Calculate progress increments
      const BATCH_SIZE = 4; // Same as backend
      const totalBatches = Math.ceil(files.length / BATCH_SIZE);
      const progressPerBatch = 80 / totalBatches; // Reserve 20% for initial and final steps

      // Simulate progress for batch processing
      let currentBatch = 0;
      const progressInterval = setInterval(() => {
        if (currentBatch < totalBatches) {
          const batchStart = currentBatch * BATCH_SIZE;
          const batchEnd = Math.min(batchStart + BATCH_SIZE, files.length);
          setProgress(10 + (currentBatch * progressPerBatch));
          setProcessingStatus(`Processing batch ${currentBatch + 1} of ${totalBatches} (Files ${batchStart + 1}-${batchEnd})`);
          currentBatch++;
        } else {
          clearInterval(progressInterval);
        }
      }, 5000); // Update every 5 seconds

      // Get the JSON response
      const responseData = await response.json();
      
      // Set parsed results
      setParsedResults(responseData.results);

      // Convert base64 to blob
      const byteCharacters = atob(responseData.excelData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});

      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'parsed_resumes.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Clear the files after successful upload
      setFiles([]);
      setProcessingStatus('Complete!');
      setTimeout(() => {
        setProgress(0);
        setProcessingStatus('');
      }, 2000);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload resumes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const UploadBox = isDragActive ? DragActiveContainer : UploadContainer;

  return (
    <Container 
      maxWidth={false}
      disableGutters
      sx={{
        width: '100%',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #E0EAFC 20%, #CFDEF3 80%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ 
        width: 'auto',
        maxWidth: { xs: '100%', sm: '600px' },
        padding: { xs: 2, sm: 4, md: 4 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: 1,
      }}>
        <Typography 
          variant="h3" 
          component="h1" 
          gutterBottom 
          align="center"
          sx={{
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
            color: '#000000',
            fontWeight: '700',
            marginTop: { xs: 2, sm: 4 },
            letterSpacing: '-0.5px',
            padding: { xs: '0 10px', sm: 0 },
          }}
        >
          Resume AI Parser
        </Typography>
        
        <UploadBox
          elevation={0}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                borderRadius: '12px',
                backgroundColor: 'rgba(253, 237, 237, 0.8)',
                width: '90%',
                fontSize: { xs: '0.8rem', sm: '0.9rem' },
              }}
            >
              {error}
            </Alert>
          )}

          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{
                fontSize: { xs: '1rem', sm: '1.25rem' },
              }}
            >
              Drag & Drop Resumes Here.
            </Typography>
            <Typography 
              variant="body2" 
              color="textSecondary"
              sx={{
                fontSize: { xs: '0.8rem', sm: '0.9rem' }, 
              }}
            >
              or
            </Typography>
          </Box>

          <label htmlFor="resume-upload">
            <Input
              accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg"
              id="resume-upload"
              type="file"
              onChange={handleFileChange}
              multiple
            />
            <Button
              variant="contained"
              component="span"
              size="large"
              sx={{ 
                mb: 2,
                backgroundColor: '#3498db',
                borderRadius: '12px',
                padding: { xs: '8px 16px', sm: '12px 24px' },
                textTransform: 'none',
                fontSize: { xs: '0.9rem', sm: '1rem' },
                whiteSpace: 'nowrap',
                '&:hover': {
                  backgroundColor: '#2980b9',
                }
              }}
            >
              Select Resumes
            </Button>
          </label>

          {files.length > 0 && (
            <Box sx={{ 
              width: '90%',
              mt: 2,
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(2px)',
              padding: { xs: 2, sm: 3 },
              borderRadius: '16px',
              border: { xs: '3px solid rgba(255, 255, 255, 0.2)', sm: '5px solid rgba(255, 255, 255, 0.2)' },
            }}>
              <Typography 
                variant="subtitle1" 
                gutterBottom
                sx={{
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                }}
              >
                Selected files ({files.length}):
              </Typography>
              <List dense sx={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: 1,
                maxHeight: '200px',
                overflowY: 'auto',
              }}>
                {files.map((file, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      borderRadius: '8px',
                      mb: 0.5,
                      padding: { xs: '4px 8px', sm: '8px 16px' },
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      }
                    }}
                    secondaryAction={
                      <IconButton 
                        edge="end" 
                        aria-label="delete" 
                        onClick={() => removeFile(index)}
                        sx={{
                          color: '#e74c3c',
                          padding: { xs: '4px', sm: '8px' },
                          '&:hover': {
                            backgroundColor: 'rgba(231, 76, 60, 0.1)',
                          }
                        }}
                      >
                        <Delete sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                      </IconButton>
                    }
                  >
                    <ListItemText 
                      primary={file.name}
                      sx={{
                        '& .MuiListItemText-primary': {
                          color: '#34495e',
                          fontSize: { xs: '0.8rem', sm: '0.9rem' },
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          paddingRight: '40px',
                        }
                      }}
                    />
                  </ListItem>
                ))}
              </List>
              <Button
                variant="contained"
                color="primary"
                onClick={handleUpload}
                disabled={loading}
                sx={{ 
                  mt: 3,
                  backgroundColor: '#2ecc71',
                  borderRadius: '12px',
                  padding: { xs: '8px 20px', sm: '12px 28px' },
                  textTransform: 'none',
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                  width: { xs: '100%', sm: 'auto' },
                  '&:hover': {
                    backgroundColor: '#27ae60',
                  },
                  '&:disabled': {
                    backgroundColor: '#95a5a6',
                  }
                }}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : 'Upload and Parse All'}
              </Button>
            </Box>
          )}
        </UploadBox>

        <Box sx={{ mt: 2, mb: 2 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend">Select AI Model</FormLabel>
            <RadioGroup
              row
              value={modelType}
              onChange={(e) => setModelType(e.target.value as 'gemini' | 'gpt4' | 'deepseek')}
            >
              <FormControlLabel value="gemini" control={<Radio />} label="Gemini" />
              <FormControlLabel value="gpt4" control={<Radio />} label="GPT-4" />
              <FormControlLabel value="deepseek" control={<Radio />} label="DeepSeek" />
              <FormControlLabel value="llama" control={<Radio />} label="Llama-3-70B" />
            </RadioGroup>
          </FormControl>
        </Box>
      </Box>

      {loading && (
        <Box sx={{ 
          width: '90%', 
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: 3,
          borderRadius: 2,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}>
          <Typography variant="h6" gutterBottom>
            {processingStatus}
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ 
              width: '100%',
              height: 10,
              borderRadius: 5,
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 5,
                backgroundColor: '#2ecc71',
              }
            }}
          />
          <Typography variant="body2" color="textSecondary">
            {`${Math.round(progress)}% Complete`}
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          width: '100%',
          padding: { xs: 1, sm: 2 },
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(8px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          mt: 4,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(0, 0, 0, 0.9)',
            fontWeight: 500,
            fontSize: { xs: '0.8rem', sm: '0.9rem' },
            '& span': {
              color: '#fff',
              fontWeight: 600,
            }
          }}
        >
          Made with ❤️ by Fardeen Beigh © {new Date().getFullYear()}
        </Typography>
      </Box>
    </Container>
  );
}

export default App;
