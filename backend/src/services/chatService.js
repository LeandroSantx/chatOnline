import { sanitizeInput } from '../utils/sanitize.js';

class ChatService {
  constructor() {
    this.users = new Map(); // socket.id -> { id, username, room }
    this.messages = [];     // Array de mensagens em memória
    this.MAX_MESSAGES = 100;
  }

  addUser(socketId, username, room = 'Geral') {
    const cleanUsername = sanitizeInput(username);
    
    if (!cleanUsername || cleanUsername.length > 20) {
      return { error: 'Nome inválido. Deve ter entre 1 e 20 caracteres.' };
    }

    const user = { id: socketId, username: cleanUsername, room };
    this.users.set(socketId, user);
    return { user };
  }

  // Novo método para atualizar a sala do usuário no Map
  updateUserRoom(socketId, newRoom) {
    const user = this.users.get(socketId);
    if (user) {
      user.room = newRoom;
      this.users.set(socketId, user);
    }
    return user;
  }

  removeUser(socketId) {
    const user = this.users.get(socketId);
    if (user) {
      this.users.delete(socketId);
    }
    return user;
  }

  getUser(socketId) {
    return this.users.get(socketId);
  }

  getRoomUsers(room = 'Geral') {
    return Array.from(this.users.values()).filter(u => u.room === room);
  }

  addMessage(socketId, text, room = 'Geral') {
    const user = this.getUser(socketId);
    if (!user) return { error: 'Usuário não registrado.' };

    const cleanText = sanitizeInput(text);
    if (!cleanText || cleanText.length > 500) {
      return { error: 'Mensagem inválida. Deve ter entre 1 e 500 caracteres.' };
    }

    const message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      username: user.username,
      userId: user.id,
      text: cleanText,
      room: room, // Vincula a mensagem à sala específica
      timestamp: new Date().toISOString()
    };

    this.messages.push(message);
    if (this.messages.length > this.MAX_MESSAGES) {
      this.messages.shift();
    }

    return { message };
  }

  // Retorna apenas o histórico pertencente à sala solicitada
  getRecentMessages(room = 'Geral') {
    return this.messages.filter(msg => msg.room === room);
  }
}

export const chatService = new ChatService();