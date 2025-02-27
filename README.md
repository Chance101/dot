# Chase's Personal AI Site

A Next.js web application that serves as Chase Hitchens' personal AI assistant website. Visitors can interact with an AI chatbot to learn about Chase's professional experience, projects, and blog.

## Features

- Interactive chat interface with Claude AI integration
- Information about Chase's professional experience, skills, and projects
- Integration with Chase's WordPress blog
- Mobile responsive design with dark mode support

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file with your API keys:
   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```
   Get an API key from [Anthropic Console](https://console.anthropic.com/)

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Technologies Used

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Anthropic Claude AI
- WordPress API integration

## Project Structure

- `/app` - Next.js app directory
- `/components` - React components
- `/data` - Static data files
- `/services` - External API integrations
- `/types` - TypeScript type definitions

## Troubleshooting

If you encounter issues with the chat functionality:

1. Verify your Anthropic API key is valid and correctly set in `.env.local`
2. Check browser console for error messages
3. Restart the development server with `npm run dev`
