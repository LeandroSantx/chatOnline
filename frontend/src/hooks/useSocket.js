import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

// Lê a URL do backend de produção ou usa localhost no ambiente de desenvolvimento
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'

export const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true
})

export function useSocket(currentRoom, username, userId) {
  const [messages, setMessages] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [typingUsers, setTypingUsers] = useState([])

  useEffect(() => {
    if (!username || !userId) return

    function onConnect() {
      socket.emit('user:join', { username, userId, room: currentRoom })
    }

    if (socket.connected) {
      onConnect()
    } else {
      socket.connect()
    }

    socket.on('connect', onConnect)

    socket.on('message:history', (history) => {
      setMessages(history)
    })

    socket.on('message:receive', (msg) => {
      setMessages((prev) => [...prev, msg])
    })

    socket.on('message:updated', (updatedMsg) => {
      setMessages((prev) => prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)))
    })

    socket.on('message:deleted', ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    })

    socket.on('users:update', (users) => {
      setOnlineUsers(users)
    })

    socket.on('typing:update', ({ username: typingUser, isTyping }) => {
      setTypingUsers((prev) => {
        if (isTyping) {
          return prev.includes(typingUser) ? prev : [...prev, typingUser]
        } else {
          return prev.filter((u) => u !== typingUser)
        }
      })
    })

    return () => {
      socket.off('connect', onConnect)
      socket.off('message:history')
      socket.off('message:receive')
      socket.off('message:updated')
      socket.off('message:deleted')
      socket.off('users:update')
      socket.off('typing:update')
    }
  }, [username, userId])

  // Troca de sala
  useEffect(() => {
    if (socket.connected && currentRoom) {
      socket.emit('room:join', { room: currentRoom })
    }
  }, [currentRoom])

  const sendMessage = (text, replyTo = null) => {
    socket.emit('message:send', { text, room: currentRoom, replyTo, userId })
  }

  const sendTyping = (isTyping) => {
    if (isTyping) {
      socket.emit('typing:start', { room: currentRoom })
    } else {
      socket.emit('typing:stop', { room: currentRoom })
    }
  }

  const handleEdit = (messageId, newText) => {
    socket.emit('message:edit', { messageId, newText })
  }

  const handleDelete = (messageId) => {
    socket.emit('message:delete', { messageId })
  }

  return {
    messages,
    onlineUsers,
    typingUsers,
    sendMessage,
    sendTyping,
    handleEdit,
    handleDelete
  }
}