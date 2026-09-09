import { useEffect, useRef, useState } from 'react';

export const MessageList = ({
  messages,
  currentSocketId,
  typingUsers,
  onReply,
  onEdit,
  onDelete
}) => {
  const bottomRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const startEdit = (msg) => {
    setEditingId(msg.id);
    setEditText(msg.text);
  };

  const saveEdit = (msgId) => {
    if (editText.trim()) {
      onEdit(msgId, editText.trim());
    }
    setEditingId(null);
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
        const isEditingThis = editingId === msg.id;

        return (
          <div key={msg.id} className={`msg-wrapper ${isMe ? 'me' : 'other'}`}>
            {!isMe && <span className="msg-author">{msg.username}</span>}

            <div className="msg-bubble" style={{ position: 'relative' }}>
              {/* Bloco de citação (se for uma resposta) */}
              {msg.replyTo && (
                <div
                  style={{
                    background: 'rgba(0,0,0,0.2)',
                    borderLeft: '3px solid #6366f1',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    marginBottom: '6px',
                    fontSize: '0.8rem'
                  }}
                >
                  <strong>{msg.replyTo.username}</strong>: {msg.replyTo.text}
                </div>
              )}

              {/* Modo Edição Inline vs Texto Normal */}
              {isEditingThis ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #555',
                      background: '#222',
                      color: '#fff'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                    <button onClick={() => saveEdit(msg.id)} style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
                      Salvar
                    </button>
                    <button onClick={() => setEditingId(null)} style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span>{msg.text}</span>
                  {msg.isEdited && (
                    <span style={{ fontSize: '0.7rem', opacity: 0.6, marginLeft: '6px' }}>(editado)</span>
                  )}
                </>
              )}

              {/* Menu Ações (Aparece em hover ou via botões discretos) */}
              {!isEditingThis && (
                <div
                  className="msg-actions"
                  style={{
                    display: 'flex',
                    gap: '6px',
                    marginTop: '4px',
                    fontSize: '0.75rem',
                    opacity: 0.8
                  }}
                >
                  <button
                    onClick={() => onReply(msg)}
                    style={{ background: 'none', border: 'none', color: '#a5b4fc', cursor: 'pointer', padding: 0 }}
                  >
                    Responder
                  </button>
                  {isMe && (
                    <>
                      <button
                        onClick={() => startEdit(msg)}
                        style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: 0 }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onDelete(msg.id)}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0 }}
                      >
                        Excluir
                      </button>
                    </>
                  )}
                </div>
              )}

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