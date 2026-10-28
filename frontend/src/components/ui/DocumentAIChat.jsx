import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, AlertCircle, X, FileText } from 'lucide-react';
import { api } from '../../lib/api';
import { Button } from './Button';
import './ui.css';

const createMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const DOCUMENT_CHIPS = {
  prescription: [
    'What medicines are listed in this prescription?',
    'Can you explain the instructions written here?',
    'What does this medical abbreviation mean?',
    'Can you summarize this prescription in simple language?',
  ],
  'health-record': [
    'Can you explain my test results in simple language?',
    'What do these medical terms mean?',
    'Can you summarize this report?',
    'Which values are marked high or low in the report?',
  ],
};

export const DocumentAIChat = ({
  isOpen,
  onClose,
  document,
}) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const messagesEndRef = useRef(null);

  const documentType = document.documentType || 'prescription';
  const suggestedChips = DOCUMENT_CHIPS[documentType] || DOCUMENT_CHIPS.prescription;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: createMessageId(),
          sender: 'bot',
          text: `I'm ready to answer questions about "${document.fileName || 'this document'}". You can ask about medicines, instructions, test results, or anything else in the document.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [isOpen, document]);

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isTyping) return;

    const userMsg = {
      id: createMessageId(),
      sender: 'user',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const history = messages
      .filter((m) => m.sender === 'user' || m.sender === 'bot')
      .slice(-10)
      .map((m) => ({
        role: m.sender === 'bot' ? 'assistant' : 'user',
        content: m.text,
      }));

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setErrorMessage('');
    setIsTyping(true);

    try {
      const response = await api.post(
        '/ai/chat/document',
        {
          documentId: document._id,
          documentType,
          message: text,
          history,
        },
        { requireAuth: true }
      );

      const data = response.reply || {};
      setMessages(prev => [...prev, {
        id: createMessageId(),
        sender: 'bot',
        text: data.reply || 'I could not generate a response.',
        noContent: data.noContent === true,
        source: data.source,
        disclaimer: data.disclaimer || 'This information is educational only and does not substitute professional medical advice, diagnosis, or treatment.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to reach the MediCare AI service. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container fade-in"
        style={{ maxWidth: '700px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ai-chat-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', background: 'linear-gradient(135deg, var(--primary-900), var(--neutral-900))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="ai-header-info" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div className="ai-avatar-icon" style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, var(--primary-500), var(--accent-teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Bot size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>Ask MediCare AI</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--primary-200)', margin: '0.15rem 0 0 0' }}>
                About "{document.fileName || 'document'}" • educational only
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close chat" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-400)', background: 'none', border: 'none' }}>
            <X size={18} />
          </button>
        </div>

        <div className="ai-chat-messages" style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', backgroundColor: 'var(--bg-app)' }}>
          {messages.length === 0 && (
            <div className="chat-bubble bot">
              <p>Ask a question about the document. This information is educational only and not medical advice.</p>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`chat-bubble ${msg.sender}`} style={{ maxWidth: '80%', padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)', fontSize: '0.925rem', lineHeight: '1.5', ...(msg.sender === 'bot' ? { alignSelf: 'flex-start', backgroundColor: 'var(--surface-card)', color: 'var(--neutral-900)', border: '1px solid var(--border-subtle)', borderBottomLeftRadius: '4px' } : { alignSelf: 'flex-end', background: 'linear-gradient(135deg, var(--primary-600), var(--primary-700))', color: 'white', borderBottomRightRadius: '4px' }) }}>
              <p style={{ margin: 0 }}>{msg.text}</p>
              {msg.noContent && (
                <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.9, color: 'var(--text-muted)' }}>
                  The document has no readable text, so I can't answer questions about its contents. Try retrying document processing on its details page.
                </p>
              )}
              {msg.disclaimer && (
                <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.7 }}>
                  {msg.disclaimer}
                </p>
              )}
              {msg.source && (
                <p style={{ fontSize: '0.72rem', marginTop: '0.4rem', opacity: 0.6, fontStyle: 'italic' }}>
                  Source: {msg.source.fileName || 'document'}
                </p>
              )}
              <span style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '0.35rem', display: 'block', textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
                {msg.time}
              </span>
            </div>
          ))}

          {errorMessage && (
            <div style={{ backgroundColor: '#ffe4e6', border: '1px solid rgba(225, 29, 72, 0.3)', color: '#e11d48', padding: '0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: '600' }}>
              <AlertCircle size={18} style={{ marginRight: '0.5rem' }} />
              {errorMessage}
            </div>
          )}

          {isTyping && (
            <div className="chat-bubble bot" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--surface-card)', color: 'var(--neutral-900)', border: '1px solid var(--border-subtle)', borderBottomLeftRadius: '4px' }}>
              <Sparkles size={16} className="animate-spin text-primary" />
              <span>MediCare AI is analyzing the document...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--surface-card)', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '0.75rem' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: '600' }}>
              Suggested questions:
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {suggestedChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  disabled={isTyping}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: isTyping ? 'var(--neutral-100)' : 'var(--surface-card)',
                    color: isTyping ? 'var(--neutral-400)' : 'var(--primary-700)',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: isTyping ? 'not-allowed' : 'pointer',
                    opacity: isTyping ? 0.6 : 1,
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
          <form
            className="ai-chat-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{ padding: 0, backgroundColor: 'transparent', borderTop: 'none', marginTop: '0.5rem', flexDirection: 'row', gap: '0.5rem' }}
          >
            <input
              type="text"
              placeholder="Ask about this document..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              style={{ flex: 1, padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)', outline: 'none', backgroundColor: 'var(--neutral-50)' }}
            />
            <Button type="submit" variant="primary" icon={Send} disabled={!inputValue.trim() || isTyping}>
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
