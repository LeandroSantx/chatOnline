import { useState, useRef } from 'react';

export const MessageInput = ({ onSendMessage, onTyping, replyTo, onCancelReply }) => {
  const [text, setText] = useState('');
  const typingTimeoutRef = useRef(null);

  const handleTextChange = (e) => {
    setText(e.target.value);

    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 1500);
  };

  const handleSend = () => {
    if (!text.trim()) return;
    onSendMessage(text.trim(), replyTo);
    setText('');
    if (onCancelReply) onCancelReply();
    onTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="input-container-wrapper" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Banner visual de mensagem sendo respondida */}
      {replyTo && (
        <div
          style={{
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            padding: '6px 12px',
            background: '#2d3748',
            borderRadius: '6px 6px 0 0',
            fontSize: '0.85rem',
            color: '#e2e8f0'
          }}
        >
          <span>
            Respondendo a <strong>{replyTo.username}</strong>: "{replyTo.text.slice(0, 30)}..."
          </span>
          <button
            onClick={onCancelReply}
            style={{
              background: 'none',
              border: 'none',
              color: '#f87171',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="input-container">
        <textarea
          placeholder="Digite uma mensagem... (Enter envia, Shift+Enter quebra linha)"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          maxLength={500}
          rows={1}
        />
        <button onClick={handleSend} disabled={!text.trim()}>
          Enviar
        </button>
      </div>
    </div>
  );
};