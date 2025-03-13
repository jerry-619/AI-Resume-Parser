import React, { useState, useCallback } from 'react';
import { 
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  List,
  ListItem,
  ListItemText,
  IconButton
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Delete } from '@mui/icons-material';

// Add RGB border animation
const rgbBorder = `
  @keyframes rgb-border {
    0% { border-color: rgba(255, 0, 0, 0.3); }
    33% { border-color: rgba(0, 255, 0, 0.3); }
    66% { border-color: rgba(0, 0, 255, 0.3); }
    100% { border-color: rgba(255, 0, 0, 0.3); }
  }
`;

const style = document.createElement('style');
style.textContent = rgbBorder;
document.head.appendChild(style);

const UploadContainer = styled(Paper)(({ theme }) => ({
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
  border: '5px solid',
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

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(8px)',
    borderRadius: '12px',
    '& fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    '&:hover fieldset': {
      borderColor: '#2196f3',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#2196f3',
    },
  },
  '& .MuiOutlinedInput-input': {
    color: '#000000',
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(0, 0, 0, 0.7)',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#2196f3',
  },
  marginBottom: theme.spacing(3),
}));

const Input = styled('input')({
  display: 'none'
});

function AIScoringPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [modelType, setModelType] = useState<'gemini' | 'gpt4' | 'deepseek' | 'llama'>('gemini');
  const [results, setResults] = useState<Array<any>>([]);
  const [isDragActive, setIsDragActive] = useState(false);

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
        setError('Please upload PDF or DOCX files only');
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
    if (!jobDescription || files.length === 0) {
      setError('Please provide a job description and upload resumes');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    files.forEach(file => formData.append('resumes', file));
    formData.append('modelType', modelType);
    formData.append('jobDescription', jobDescription);

    try {
      const response = await fetch('http://localhost:3000/api/resume/ai-score', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to score resumes');
      
      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
        maxWidth: { xs: '100%', sm: '800px' },
        padding: { xs: 2, sm: 4 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: 1,
      }}>
        <Typography 
          variant="h3" 
          gutterBottom 
          sx={{
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
            color: '#000000',
            fontWeight: '700',
            marginTop: { xs: 2, sm: 4 },
            letterSpacing: '-0.5px',
            textAlign: 'center',
          }}
        >
          AI Resume Scoring
        </Typography>

        <StyledTextField
          fullWidth
          label="Job Description / Position Looking For"
          multiline
          rows={4}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />

        <UploadContainer 
          elevation={3}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Typography variant="h6" gutterBottom>
            Drag & Drop Resumes Here
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            or
          </Typography>

          <label htmlFor="resume-upload-ai">
            <Input
              accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg"
              id="resume-upload-ai"
              type="file"
              onChange={handleFileChange}
              multiple
            />
            <Button variant="contained" component="span">
              Select Resumes
            </Button>
          </label>

          {files.length > 0 && (
            <Box sx={{ mt: 3, width: '100%' }}>
              <Typography variant="subtitle1" gutterBottom>
                Selected files ({files.length}):
              </Typography>
              <List dense>
                {files.map((file, index) => (
                  <ListItem
                    key={index}
                    secondaryAction={
                      <IconButton edge="end" onClick={() => removeFile(index)}>
                        <Delete />
                      </IconButton>
                    }
                  >
                    <ListItemText primary={file.name} />
                  </ListItem>
                ))}
              </List>
              <Button
                variant="contained"
                color="primary"
                onClick={handleUpload}
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Score Resumes'}
              </Button>
            </Box>
          )}
        </UploadContainer>

        <Box sx={{ 
          mt: 2, 
          mb: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          padding: 2,
          borderRadius: '12px',
          backdropFilter: 'blur(8px)',
        }}>
          <FormControl component="fieldset">
            <FormLabel 
              component="legend"
              sx={{ color: '#000000', mb: 1 }}
            >
              Select AI Model
            </FormLabel>
            <RadioGroup
              row
              value={modelType}
              onChange={(e) => setModelType(e.target.value as any)}
            >
              <FormControlLabel value="gemini" control={<Radio />} label="Gemini" />
              <FormControlLabel value="gpt4" control={<Radio />} label="GPT-4" />
              <FormControlLabel value="deepseek" control={<Radio />} label="DeepSeek" />
              <FormControlLabel value="llama" control={<Radio />} label="Llama-3-70B" />
            </RadioGroup>
          </FormControl>
        </Box>

        {results.length > 0 && (
          <Paper sx={{ 
            mt: 4, 
            p: 3,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '16px',
            width: '100%',
          }}>
            <Typography variant="h6" gutterBottom>
              Scoring Results
            </Typography>
            <TableContainer>
              <Table>
                <TableRow sx={{ 
                  '& th': { 
                    fontWeight: 'bold',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                  }
                }}>
                  <TableCell>File</TableCell>
                  <TableCell>Model</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Applied Position</TableCell>
                  <TableCell>Position Match</TableCell>
                  <TableCell>Total Experience</TableCell>
                </TableRow>
                <TableBody>
                  {results.map((result, index) => (
                    <TableRow key={index} sx={{
                      '&:nth-of-type(odd)': {
                        backgroundColor: 'rgba(255, 255, 255, 0.5)',
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(33, 150, 243, 0.05)',
                      },
                    }}>
                      <TableCell>{result.fileName}</TableCell>
                      <TableCell sx={{ textTransform: 'capitalize' }}>
                        {result.modelType}
                      </TableCell>
                      <TableCell sx={{ 
                        color: result.aiScore > 75 ? '#27ae60' : 
                               result.aiScore > 50 ? '#f39c12' : '#e74c3c',
                        fontWeight: 'bold'
                      }}>
                        {result.aiScore}%
                      </TableCell>
                      <TableCell>
                        {result.postAppliedFor || 'Not specified'}
                      </TableCell>
                      <TableCell>
                        {result.positionMatch ? 
                          <span style={{ color: '#27ae60' }}>✓ Match</span> : 
                          <span style={{ color: '#e74c3c' }}>✗ No Match</span>
                        }
                      </TableCell>
                      <TableCell>
                        {result.totalExperience || '0 years 0 months'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Box>

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
          }}
        >
          Made with ❤️ by Fardeen Beigh © {new Date().getFullYear()}
        </Typography>
      </Box>
    </Container>
  );
}

export default AIScoringPage; 