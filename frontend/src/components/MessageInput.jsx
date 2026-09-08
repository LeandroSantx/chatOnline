import { useState, useRef } from 'react';

export const MessageInput = ({ onSendMessage, onTyping }) => {
  const [text, setText] = useState('');
  const typingTimeoutRef = useRef(null);

  const handleTextChange = (e) => {
    setText(e.target.value);

    // Gestão de estado de digitação
    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 1500);
  };

  const handleSend = () => {
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setText('');
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
  );
};