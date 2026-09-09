import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export const useSocket = () => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [error, setError] = useState(null);
  const [currentRoom, setCurrentRoom] = useState('Geral');

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      autoConnect: true,
      transports: ['websocket']
    });

    const socket = socketRef.current;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    socket.on('message:history', (history) => setMessages(history));
    
    socket.on('message:receive', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // Atualiza mensagem editada na lista
    socket.on('message:updated', (updatedMsg) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === updatedMsg.id ? updatedMsg : msg))
      );
    });

    // Remove mensagem excluída da lista
    socket.on('message:deleted', ({ messageId }) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    });

    socket.on('users:update', (updatedUsers) => setUsers(updatedUsers));

    socket.on('typing:update', ({ username, isTyping }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (isTyping) next.add(username);
        else next.delete(username);
        return next;
      });
    });

    socket.on('error', (err) => {
      setError(err.message);
      setTimeout(() => setError(null), 4000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinChat = (username, callback) => {
    if (socketRef.current) {
      socketRef.current.emit('user:join', { username, room: currentRoom }, callback);
    }
  };

  const switchRoom = (newRoom) => {
    if (socketRef.current && isConnected && newRoom.trim()) {
      socketRef.current.emit('room:join', { room: newRoom });
      setCurrentRoom(newRoom);
      setMessages([]);
    }
  };

  const sendMessage = (text, replyTo = null) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('message:send', { text, room: currentRoom, replyTo });
    }
  };

  const editMessage = (messageId, newText) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('message:edit', { messageId, newText });
    }
  };

  const deleteMessage = (messageId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('message:delete', { messageId });
    }
  };

  const setTyping = (isTyping) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(isTyping ? 'typing:start' : 'typing:stop', { room: currentRoom });
    }
  };

  return {
    socketId: socketRef.current?.id,
    isConnected,
    messages,
    users,
    typingUsers: Array.from(typingUsers),
    error,
    currentRoom,
    joinChat,
    switchRoom,
    sendMessage,
    editMessage,
    deleteMessage,
    setTyping
  };
};