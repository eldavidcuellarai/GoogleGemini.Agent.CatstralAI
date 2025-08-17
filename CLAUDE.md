# Claude Instructions for GoogleGemini.Agent.CatstralAI

## Project Overview
This is a catastral property registry analyzer using Google Gemini AI. The project consists of two main components:
1. A simple HTML/JS interface (`el cerebro de gemini/`)
2. A Next.js application for PDF property document processing (`v0-registro-de-la-propiedad/`)

## Project Structure
- **Main directory**: Contains basic HTML interface and this project's core files
- **v0-registro-de-la-propiedad/**: Next.js application for property registry document processing
  - Built with Next.js 15, React 19, TypeScript
  - Uses Tailwind CSS for styling with Radix UI components
  - PDF processing with pdfjs-dist
  - AI integration using @ai-sdk packages

## Development Commands
When working on the Next.js application (v0-registro-de-la-propiedad/):
- **Development server**: `pnpm dev` or `npm run dev`
- **Build**: `pnpm build` or `npm run build`
- **Linting**: `pnpm lint` or `npm run lint`
- **Production**: `pnpm start` or `npm run start`

## Key Technologies
- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **PDF Processing**: pdfjs-dist
- **AI/ML**: @ai-sdk/openai, @ai-sdk/gateway
- **Forms**: react-hook-form with Zod validation
- **Package Manager**: pnpm (based on lock file)

## Important Notes
- Always run commands from the `v0-registro-de-la-propiedad/` directory for the main application
- Use `pnpm` as the package manager (pnpm-lock.yaml present)
- The project handles PDF document analysis for property registry documents
- AI integration is set up for document text extraction and analysis
- Follow existing TypeScript and React patterns when making changes

## Testing
- Run `pnpm lint` to check code quality
- Build the project with `pnpm build` to verify TypeScript compilation

## File Locations
- Main app logic: `v0-registro-de-la-propiedad/app/`
- Components: `v0-registro-de-la-propiedad/components/`
- Utilities: `v0-registro-de-la-propiedad/lib/` and `v0-registro-de-la-propiedad/utils/`
- Types: `v0-registro-de-la-propiedad/lib/types.ts`