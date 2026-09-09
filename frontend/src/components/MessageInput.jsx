import React, { useState, useRef } from 'react'

export const MessageInput = ({ 
  onSendMessage, 
  onTyping, 
  replyTo, 
  onCancelReply, 
  currentRoom = '100000', 
  isAdmin = false 
}) => {
  const [text, setText] = useState('')
  const typingTimeoutRef = useRef(null)

  // O canal Geral (100000 ou 'Geral') só pode ser escrito por administradores
  const isGeneralRoom = currentRoom === '100000' || currentRoom === 'Geral'
  const isReadOnly = isGeneralRoom && !isAdmin

  const handleTextChange = (e) => {
    if (isReadOnly) return
    const value = e.target.value
    setText(value)

    if (onTyping) {
      onTyping(true)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false)
      }, 2000)
    }
  }

  const handleSend = (e) => {
    e?.preventDefault()
    if (!text.trim() || isReadOnly) return

    onSendMessage(text.trim(), replyTo)
    setText('')

    if (replyTo && onCancelReply) onCancelReply()
    if (onTyping) onTyping(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{ backgroundColor: '#0f172a', padding: '12px 16px', borderTop: '1px solid #334155' }}>
      {replyTo && !isReadOnly && (
        <div style={{ 
          display: 'flex', 
          justify: 'space-between', 
          alignItems: 'center', 
          backgroundColor: '#1e293b', 
          padding: '8px 12px', 
          borderRadius: '8px', 
          marginBottom: '8px',
          borderLeft: '4px solid #6366f1'
        }}>
          <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
            Respondendo a <strong style={{ color: '#818cf8' }}>{replyTo.username}</strong>: "{replyTo.text}"
          </div>
          <button 
            onClick={onCancelReply} 
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <textarea
          value={isReadOnly ? '' : text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          disabled={isReadOnly}
          placeholder={
            isReadOnly 
              ? '🔒 Canal de anúncios' 
              : 'Digite sua mensagem...'
          }
          rows={1}
          style={{
            flex: 1,
            backgroundColor: isReadOnly ? '#1e293b80' : '#1e293b',
            color: isReadOnly ? '#94a3b8' : '#f8fafc',
            border: '1px solid #334155',
            borderRadius: '10px',
            padding: '10px 14px',
            fontSize: '0.95rem',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            cursor: isReadOnly ? 'not-allowed' : 'text'
          }}
        />
        <button
          type="submit"
          disabled={isReadOnly || !text.trim()}
          style={{
            backgroundColor: !isReadOnly && text.trim() ? '#4f46e5' : '#334155',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 20px',
            fontWeight: '600',
            cursor: !isReadOnly && text.trim() ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.2s',
            opacity: isReadOnly ? 0.6 : 1
          }}
        >
          Enviar
        </button>
      </form>
    </div>
  )
}