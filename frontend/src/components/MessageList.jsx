import React, { useState } from 'react'

export const MessageList = ({
  messages = [],
  currentUserId,
  typingUsers = [],
  onReply,
  onEdit,
  onDelete
}) => {
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')

  const startEditing = (msg) => {
    setEditingId(msg.id)
    setEditText(msg.text)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditText('')
  }

  const saveEdit = (msgId) => {
    if (editText.trim()) {
      onEdit(msgId, editText.trim())
    }
    cancelEditing()
  }

  return (
    <div className="message-list" style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {messages.map((msg) => {
        const isMe = Boolean(
          currentUserId && (msg.userId === currentUserId || msg.senderId === currentUserId)
        )
        const isEditing = editingId === msg.id

        return (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: isMe ? 'flex-end' : 'flex-start',
              width: '100%'
            }}
          >
            <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '2px', padding: '0 4px' }}>
              {isMe ? 'Você' : msg.username}
            </span>

            <div
              style={{
                backgroundColor: isMe ? '#4f46e5' : '#374151',
                color: '#fff',
                padding: '10px 14px',
                borderRadius: '12px',
                borderBottomRightRadius: isMe ? '2px' : '12px',
                borderBottomLeftRadius: isMe ? '12px' : '2px',
                minWidth: '180px',
                maxWidth: '80%',
                wordBreak: 'break-word',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
              }}
            >
              {/* Balão de Resposta */}
              {msg.replyTo && (
                <div
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    borderLeft: '3px solid #818cf8',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    marginBottom: '6px'
                  }}
                >
                  <strong style={{ display: 'block', fontSize: '0.75rem' }}>{msg.replyTo.username}</strong>
                  <span style={{ opacity: 0.8 }}>{msg.replyTo.text}</span>
                </div>
              )}

              {/* Conteúdo da Mensagem */}
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(msg.id)
                      if (e.key === 'Escape') cancelEditing()
                    }}
                    autoFocus
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#fff',
                      border: '1px solid #818cf8',
                      borderRadius: '4px',
                      padding: '6px 8px',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => saveEdit(msg.id)}
                      style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      Salvar
                    </button>
                    <button
                      onClick={cancelEditing}
                      style={{ background: '#64748b', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.95rem', lineHeight: '1.4' }}>{msg.text}</div>
              )}

              {/* Rodapé do Balão (Hora + Botões) */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '8px',
                  gap: '8px',
                  fontSize: '0.7rem',
                  opacity: 0.8,
                  whiteSpace: 'nowrap',
                  flexWrap: 'nowrap'
                }}
              >
                <span>
                  {msg.createdAt
                    ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : ''}
                </span>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => onReply(msg)}
                    style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '0.7rem', padding: 0 }}
                  >
                    Responder
                  </button>

                  {isMe && !isEditing && (
                    <>
                      <button
                        onClick={() => startEditing(msg)}
                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '0.7rem', padding: 0 }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onDelete(msg.id)}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.7rem', padding: 0 }}
                      >
                        Excluir
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {typingUsers.length > 0 && (
        <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontStyle: 'italic', marginTop: '5px' }}>
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'está digitando...' : 'estão digitando...'}
        </div>
      )}
    </div>
  )
}