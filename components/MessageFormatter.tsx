// components/MessageFormatter.tsx
import React from 'react';

interface MessageFormatterProps {
  content: string;
}

/**
 * A component for formatting message content with support for:
 * - Paragraphs
 * - Bullet points
 * - Numbered lists
 * - Simple formatting (bold, italic)
 */
const MessageFormatter: React.FC<MessageFormatterProps> = ({ content }) => {
  if (!content) return null;

  // Process simple markdown
  const processMarkdown = (text: string): string => {
    // Bold: **text** or __text__
    let processed = text.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
    
    // Italic: *text* or _text_
    processed = processed.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
    
    return processed;
  };

  // Split content by paragraphs
  const paragraphs = content.split('\n\n');
  
  return (
    <>
      {paragraphs.map((paragraph, index) => {
        // Check for bullet list (lines starting with -, *, •)
        if (paragraph.match(/^[\-\*•]\s.+/m)) {
          const listItems = paragraph
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
              const match = line.match(/^[\-\*•]\s(.+)$/);
              return match ? match[1] : line;
            });
            
          return (
            <ul key={index} className="list-disc pl-5 my-2">
              {listItems.map((item, i) => (
                <li 
                  key={i} 
                  className="my-1"
                  dangerouslySetInnerHTML={{ __html: processMarkdown(item) }}
                />
              ))}
            </ul>
          );
        }
        
        // Check for numbered list (lines starting with 1., 2., etc)
        if (paragraph.match(/^\d+\.\s.+/m)) {
          const listItems = paragraph
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
              const match = line.match(/^\d+\.\s(.+)$/);
              return match ? match[1] : line;
            });
            
          return (
            <ol key={index} className="list-decimal pl-5 my-2">
              {listItems.map((item, i) => (
                <li 
                  key={i} 
                  className="my-1"
                  dangerouslySetInnerHTML={{ __html: processMarkdown(item) }}
                />
              ))}
            </ol>
          );
        }
        
        // Regular paragraph
        return (
          <p 
            key={index} 
            className={index > 0 ? 'mt-4' : ''}
            dangerouslySetInnerHTML={{ __html: processMarkdown(paragraph) }}
          />
        );
      })}
    </>
  );
};

export default React.memo(MessageFormatter);
