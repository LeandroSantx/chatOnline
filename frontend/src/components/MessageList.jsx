import React, { useState, useEffect, useRef } from 'react'

export const MessageList = ({
  messages = [],
  currentUserId,
  currentRoom = '100000',
  typingUsers = [],
  onReply,
  onEdit,
  onDelete
}) => {
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const messagesEndRef = useRef(null)

  const isGeneralRoom = currentRoom === '100000' || currentRoom === 'Geral'

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, typingUsers])

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
      
      {/* Card Fixo de Tutorial / Anúncios na Sala Geral */}
      {isGeneralRoom && (
        <div style={{
          backgroundColor: '#1e293b',
          border: '1px solid #6366f1',
          borderRadius: '12px',
          padding: '16px',
          color: '#f8fafc',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          marginBottom: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>📌</span>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#818cf8' }}>
              Bem-vindo ao RESENHA — Guia do Sistema
            </h3>
          </div>
          <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.4' }}>
            Este é o canal geral de avisos. Confira abaixo as instruções para utilizar a plataforma:
          </p>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6' }}>
            <li><strong>Criar Salas Privadas:</strong> Abra o menu lateral <code>☰</code> e clique em <em>+ Criar Nova Sala</em>.</li>
            <li><strong>Entrar por ID:</strong> Digite o código de 6 dígitos no menu lateral para acessar uma sala existente.</li>
            <li><strong>Apagar Salas:</strong> Você pode remover salas da sua lista a qualquer momento pelo botão <code>✕</code>.</li>
            <li><strong>Mensagens:</strong> Você pode responder a mensagens específicas ou editá-las/excluí-las no menu de cada balão.</li>
          </ul>
        </div>
      )}

      {messages.map((msg) => {
        // Renderização para Mensagens de Sistema (Ex: "Entrou no chat")
        if (msg.type === 'system') {
          // Oculta avisos de entrada/saída em conversas privadas (só exibe em salas públicas/grupos)
          if (!isGeneralRoom) return null

          return (
            <div
              key={msg.id}
              style={{
                alignSelf: 'center',
                backgroundColor: '#334155',
                color: '#94a3b8',
                fontSize: '0.75rem',
                padding: '4px 12px',
                borderRadius: '12px',
                margin: '4px 0',
                textAlign: 'center',
                maxWidth: '80%'
              }}
            >
              {msg.text}
            </div>
          )
        }

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

              {/* Rodapé do Balão */}
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

      <div ref={messagesEndRef} />
    </div>
  )
}