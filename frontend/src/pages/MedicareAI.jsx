import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './pages.css';

const createMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;

export const MedicareAI = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const messagesEndRef = useRef(null);
  
  // Redirect non-patients away from AI chat
  useEffect(() => {
    if (user && user.role !== 'patient') {
      const targetPath = user.role === 'doctor' ? '/doctor' : user.role === 'hospital' ? '/hospital' : '/';
      navigate(targetPath, { replace: true });
    }
  }, [user, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend) => {
    // Double-check: only patients can use MediCare AI
    if (user?.role !== 'patient') {
      setErrorMessage('MediCare AI is only available to patients.');
      return;
    }

    const text = (textToSend || inputValue).trim();
    if (!text || isTyping) return;

    const userMsg = {
      id: createMessageId(),
      sender: 'user',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const history = messages
      .filter((message) => message.sender === 'user' || message.sender === 'bot')
      .slice(-10)
      .map((message) => ({
        role: message.sender === 'bot' ? 'assistant' : 'user',
        content: message.text
      }));

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setErrorMessage('');
    setIsTyping(true);

    try {
      const response = await api.post('/ai/chat', { message: text, history }, { requireAuth: true });
      setMessages(prev => [...prev, {
        id: createMessageId(),
        sender: 'bot',
        text: response.reply,
        disclaimer: response.disclaimer,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to reach the MediCare AI service. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="ai-page-container fade-in">
      {/* Header */}
      <div className="ai-chat-header">
        <div className="ai-header-info">
          <div className="ai-avatar-icon">
            <Bot size={26} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800' }}>MediCare+ Healthcare Information Assistant</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--primary-200)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              Educational information only • not medical advice
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={RefreshCw}
          onClick={() => {
            setMessages([]);
            setErrorMessage('');
          }}
          style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
        >
          Reset Chat
        </Button>
      </div>

      {/* Messages Feed */}
      <div className="ai-chat-messages">
        {messages.length === 0 && (
          <div className="chat-bubble bot">
            <p>Ask a healthcare education or MediCare+ feature question. Do not use this chat for emergencies or as a substitute for professional medical advice.</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`chat-bubble ${msg.sender}`}>
            <p>{msg.text}</p>
            {msg.disclaimer && (
              <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.8 }}>
                {msg.disclaimer}
              </p>
            )}
            <span style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '0.35rem', display: 'block', textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
              {msg.time}
            </span>

            {msg.suggestedChips && (
              <div className="suggested-chips-wrapper">
                {msg.suggestedChips.map((chip, idx) => (
                  <button
                    key={idx}
                    className="chip"
                    style={{ fontSize: '0.775rem', padding: '0.3rem 0.75rem', backgroundColor: 'var(--neutral-100)' }}
                    onClick={() => handleSendMessage(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {errorMessage && (
          <div className="upload-alert error" role="alert">
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {isTyping && (
          <div className="chat-bubble bot fade-in" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={16} className="animate-spin text-primary" />
            <span>MediCare AI is formulating medical insights...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        className="ai-chat-input-row"
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
      >
        <input
          type="text"
          placeholder="Ask MediCare AI about symptoms, dosage, side effects, or lab results..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <Button
          type="submit"
          variant="primary"
          icon={Send}
          disabled={!inputValue.trim() || isTyping}
        >
          Send
        </Button>
      </form>
    </div>
  );
};
