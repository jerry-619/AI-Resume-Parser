# Resume AI Parser

## Overview
A sophisticated web application designed to revolutionize the resume screening process by harnessing the power of multiple state-of-the-art AI models. This application provides comprehensive resume analysis, intelligent scoring, and detailed information extraction capabilities, making it an invaluable tool for HR professionals and recruiters.

The system leverages advanced natural language processing and machine learning techniques through integration with premium AI models via Sree Shop's API. By combining the strengths of multiple AI models including Google Gemini, GPT-4, DeepSeek, and Llama-3-70B, the application delivers highly accurate and nuanced analysis of candidate profiles.

Key capabilities include:
- Intelligent parsing of multiple document formats with high accuracy
- Advanced semantic analysis for skill matching and experience validation
- Automated scoring system based on job requirement alignment
- Detailed extraction of professional and educational history
- Smart calculation of relevant experience and expertise levels

The application is built on a modern tech stack featuring React and TypeScript for the frontend, ensuring a responsive and intuitive user experience, while the Node.js backend handles complex document processing and AI model orchestration. The architecture is designed for scalability and performance, capable of handling high-volume resume processing while maintaining quick response times.

This tool streamlines the recruitment process by automating the time-consuming task of resume screening, while providing deeper insights into candidate qualifications than traditional parsing solutions. Whether you're a small business or a large enterprise, this AI-powered resume parser adapts to your needs, offering customizable analysis parameters and detailed reporting capabilities.

## 🌟 Features
- **Multi-format Support**: 
  - Handles PDF, DOCX, PNG, and JPG files
  - Intelligent text extraction from all supported formats

- **AI-Powered Analysis**:
  - Multiple AI model support:
    - Google Gemini
    - GPT-4
    - DeepSeek
    - Llama-3-70B
  - Smart resume scoring against job descriptions
  - Position matching validation
  - Total experience calculation

- **Information Extraction**:
  - Personal details (name, email, phone)
  - Education history
  - Work experience with responsibilities
  - Position applied for
  - Total years of experience

- **Modern Interface**:
  - Drag & drop file upload
  - Real-time processing feedback
  - Glassmorphic UI design
  - Responsive layout for all devices
  - Interactive results display

- **Export Capabilities**:
  - Structured Excel report generation
  - Detailed parsing results
  - Formatted experience calculations

## 🚀 Tech Stack

### Frontend
- React with TypeScript
- Material-UI (MUI)
- Styled Components
- React Router
- Modern CSS animations

### Backend
- Node.js & Express
- Multiple AI model integrations
- PDF/DOCX/Image processing
- Excel report generation

## 📋 Prerequisites
- Node.js (v16 or higher)
- npm (v8 or higher)
- Access to AI models via Sree Shop

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd resume-ai-parser
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```
   Create `.env` file:
   ```env
   PORT=3000
   GEMINI_API_KEY=your_gemini_api_key
   OPENAI_API_KEY=your_openai_api_key
   OPENAI_BASE_URL=https://beta.sree.shop/v1
   DEEPSEEK_MODEL=your_deepseek_model
   CHATGPT_MODEL=your_chatgpt_model
   LLAMA_MODEL=your_llama_model
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

## 🚀 Running the Application

1. **Start Backend**
   ```bash
   cd backend
   npm start
   ```

2. **Start Frontend**
   ```bash
   cd frontend
   npm start
   ```

## 📊 Features in Detail

### AI Scoring System
- Analyzes resumes against job descriptions
- Provides percentage match scores
- Validates position compatibility
- Calculates total experience

### Resume Parsing
- Extracts structured information
- Handles multiple file formats
- Processes batches efficiently
- Rate-limited for optimal performance

### Excel Report
- Comprehensive data organization
- Formatted experience details
- Education and work history
- Position matching results

## 🤝 Special Thanks
Special thanks to [Sree Shop](https://www.sree.shop/) for providing access to:
- ChatGPT
- DeepSeek
- Llama AI models

## 👨‍💻 Author
**Fardeen Beigh**

## 📞 Support
For support or inquiries, please contact:
- Email: fardeenz619@gmail.com
- Open an issue in the repository

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```

```
