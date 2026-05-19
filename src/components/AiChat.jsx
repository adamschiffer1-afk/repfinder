'use client';

import { useState, useRef, useEffect } from 'react';
import styles from '@/styles/AiChat.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faPaperPlane, faTimes, faSparkles } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

// Helper to parse basic markdown (links, bold, lists) from Gemini response
const formatMessage = (text) => {
  if (!text) return '';
  
  // Convert markdown links: [text](url) -> <a href="url" target="_blank">text</a>
  let formatted = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Convert bold: **text** -> <strong>$1</strong>
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Convert lists
  const lines = formatted.split('\n');
  let inList = false;
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      const content = trimmed.substring(2);
      let prefix = '';
      if (!inList) {
        inList = true;
        prefix = '<ul style="margin: 5px 0; padding-left: 20px; list-style-type: disc;">';
      }
      return `${prefix}<li>${content}</li>`;
    } else {
      let suffix = '';
      if (inList) {
        inList = false;
        suffix = '</ul>';
      }
      return suffix + line;
    }
  });
  
  if (inList) {
    processedLines.push('</ul>');
  }
  
  return processedLines
    .join('<br />')
    .replace(/<br \/><ul/g, '<ul')
    .replace(/<\/ul><br \/>/g, '</ul>')
    .replace(/(<br \/>){2,}/g, '<br /><br />'); // limit multiple breaks
};

export default function AiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Siemanko! Jestem asystentem RepFinder AI. Pomogę Ci w zakupach replik, korzystaniu z KakoBuy (gdzie zgarniesz $400 bonusu) lub obliczaniu wysyłki. O co chcesz zapytać?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build conversation history (sending max 10 messages to keep request context small)
      const chatHistory = [...messages, userMessage].slice(-10);
      
      const response = await axios.post('/api/chat', { messages: chatHistory });
      
      if (response.data?.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.data.reply }]);
      } else {
        throw new Error('No reply from server');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errMsg = error.response?.data?.error || error.message || 'Unknown error';
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Wystąpił problem techniczny: **${errMsg}**. Upewnij się, czy w pliku \`.env.local\` jest poprawny \`GEMINI_API_KEY\` i zrestartowałeś serwer (\`npm run dev\`).` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.chatWidget}>
      {/* Floating Action Button */}
      <button 
        className={`${styles.chatButton} ${isOpen ? styles.chatButtonActive : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Czat AI"
      >
        <FontAwesomeIcon icon={isOpen ? faTimes : faRobot} />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={styles.chatWindow}>
          {/* Header */}
          <div className={styles.chatHeader}>
            <div className={styles.headerInfo}>
              <div className={styles.botAvatar}>
                <FontAwesomeIcon icon={faSparkles} />
              </div>
              <div className={styles.botNameContainer}>
                <span className={styles.botName}>RepFinder AI</span>
                <span className={styles.botStatus}>Online</span>
              </div>
            </div>
            <button className={styles.closeButton} onClick={() => setIsOpen(false)}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          {/* Messages */}
          <div className={styles.messagesContainer}>
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`${styles.messageBubble} ${
                  msg.role === 'user' ? styles.messageUser : styles.messageBot
                }`}
                dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
              />
            ))}
            
            {isLoading && (
              <div className={styles.typingIndicator}>
                <span className={styles.dot}></span>
                <span className={styles.dot}></span>
                <span className={styles.dot}></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input form */}
          <div className={styles.chatFooter}>
            <form onSubmit={handleSubmit} className={styles.inputForm}>
              <input
                type="text"
                className={styles.chatInput}
                placeholder="Zadaj pytanie asystentowi..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
              />
              <button 
                type="submit" 
                className={styles.sendButton}
                disabled={!input.trim() || isLoading}
              >
                <FontAwesomeIcon icon={faPaperPlane} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
