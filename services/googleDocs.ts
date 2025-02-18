import { google } from 'googleapis';

// Initialize the Google Docs API client
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  },
  scopes: ['https://www.googleapis.com/auth/documents.readonly']
});

const docs = google.docs({ version: 'v1', auth });

// Cache mechanism
let cachedResume: any = null;
let lastFetch: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export async function getResumeFromGoogleDocs() {
  // Return cached version if it's less than 24 hours old
  if (cachedResume && (Date.now() - lastFetch < CACHE_DURATION)) {
    return cachedResume;
  }

  try {
    const documentId = process.env.GOOGLE_DOC_RESUME_ID;
    if (!documentId) {
      throw new Error('Google Doc ID not configured');
    }

    const response = await docs.documents.get({
      documentId
    });

    // Parse the document content into a structured format
    const document = response.data;
    const parsedResume = parseGoogleDoc(document);
    
    // Update cache
    cachedResume = parsedResume;
    lastFetch = Date.now();

    return parsedResume;
  } catch (error) {
    console.error('Error fetching resume from Google Docs:', error);
    throw error;
  }
}

function parseGoogleDoc(document: any) {
  // This is a basic parser - you'll need to adapt it based on your document structure
  const content = document.body.content;
  let parsedContent = {
    sections: {} as any,
    currentSection: '',
    text: ''
  };

  // Example parsing logic - you'll need to customize this
  content.forEach((element: any) => {
    if (element.paragraph) {
      const text = element.paragraph.elements
        .map((e: any) => e.textRun?.content || '')
        .join('')
        .trim();

      if (text) {
        // Detect section headers (you might want to customize this logic)
        if (element.paragraph.paragraphStyle?.namedStyleType === 'HEADING_1') {
          parsedContent.currentSection = text;
          parsedContent.sections[text] = [];
        } else {
          if (parsedContent.currentSection) {
            parsedContent.sections[parsedContent.currentSection].push(text);
          }
          parsedContent.text += text + '\n';
        }
      }
    }
  });

  return parsedContent;
}

// Export a function that returns either Google Docs content or fallback data
export async function getResume() {
  try {
    return await getResumeFromGoogleDocs();
  } catch (error) {
    console.error('Falling back to static resume data:', error);
    // Import your fallback data
    const { resumeData } = await import('@/data');
    return resumeData;
  }
}
