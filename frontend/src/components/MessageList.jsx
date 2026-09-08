import { useEffect, useRef } from 'react';

export const MessageList = ({ messages, currentSocketId, typingUsers }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="messages-container">
      {messages.map((msg) => {
        if (msg.type === 'system') {
          return (
            <div key={msg.id} className="msg-wrapper system">
              <span className="msg-system">{msg.text}</span>
            </div>
          );
        }

        const isMe = msg.userId === currentSocketId;

        return (
          <div key={msg.id} className={`msg-wrapper ${isMe ? 'me' : 'other'}`}>
            {!isMe && <span className="msg-author">{msg.username}</span>}
            <div className="msg-bubble">
              {msg.text}
              <div className="msg-footer">{formatTime(msg.timestamp)}</div>
            </div>
          </div>
        );
      })}

      {typingUsers.length > 0 && (
        <div className="typing-indicator">
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'está' : 'estão'} digitando...
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};