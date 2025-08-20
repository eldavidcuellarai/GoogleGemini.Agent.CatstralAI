# Claude Instructions for GoogleGemini.Agent.CatstralAI

## Project Overview
This is a catastral property registry analyzer using Google Gemini AI. The project is a web application built with vanilla HTML, CSS, and JavaScript that provides intelligent document analysis for catastral properties.

## Project Structure
- **Main directory**: Contains the core application files and configuration
- **el cerebro de gemini/**: Main web application for property document analysis
  - HTML/CSS/JS frontend for document upload and analysis
  - PDF processing with pdfjs-dist
  - Direct integration with Google Gemini AI
  - Real-time chat interface for document queries
- **api/**: Serverless functions for Vercel deployment
  - `gemini.js`: Secure API endpoint for Gemini AI calls

## Development Commands
- **Local Development**: `npm run dev` or `node server.js`
- **Production Build**: Files are served statically, no build step required
- **Deploy to Vercel**: Use `vercel` CLI or GitHub integration

## Key Technologies
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **PDF Processing**: PDF.js library for text extraction
- **AI Integration**: Google Gemini AI API (gemini-2.5-pro, gemini-2.5-flash)
- **Deployment**: Vercel with serverless functions
- **Security**: Environment variables for API keys

## Important Notes
- Application is optimized for Vercel deployment with serverless architecture
- API key is handled securely through environment variables (GEMINI_API_KEY)
- The project uses a serverless function (/api/gemini) for secure AI API calls
- PDF documents are processed client-side with server-side AI analysis
- Supports both property documents and mortgage documents (gravamen)
- Responsive design with dark/light mode support

## Deployment
- **Platform**: Vercel (optimized configuration)
- **Environment Variables**: 
  - Required: `GEMINI_API_KEY`
  - Optional: `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`
- **Configuration**: `vercel.json` with proper routing and security headers
- **API**: Serverless function handles Gemini API calls securely

## File Structure
- **Frontend**: `el cerebro de gemini/index.html`, `app.js`, `style.css`
- **API**: `api/gemini.js` (serverless function)
- **Config**: `vercel.json`, `.env.example`
- **Documentation**: `DEPLOYMENT.md` for deployment guide

## Development Workflow
1. Modify files in `el cerebro de gemini/` for frontend changes
2. Update `api/gemini.js` for backend API changes
3. Test locally with `npm run dev`
4. Deploy to Vercel with proper environment variables
5. No build step required - static files are served directly