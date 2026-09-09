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
    <div className="input-container-wrapper">
      {replyTo && (
        <div className="reply-banner">
          <span>
            Respondendo a <strong>{replyTo.username}</strong>
          </span>
          <button onClick={onCancelReply}>✕</button>
        </div>
      )}

      <div className="input-container">
        <textarea
          placeholder="Mensagem..."
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