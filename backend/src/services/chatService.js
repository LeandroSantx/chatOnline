import { sanitizeInput } from '../utils/sanitize.js';

class ChatService {
  constructor() {
    // Abstração de armazenamento em memória.
    // Para migrar para PostgreSQL/MongoDB no futuro, basta alterar estes métodos.
    this.users = new Map(); // socket.id -> { id, username, room }
    this.messages = [];     // Array de mensagens em memória
    this.MAX_MESSAGES = 100;
  }

  addUser(socketId, username, room = 'resenha') {
    const cleanUsername = sanitizeInput(username);
    
    if (!cleanUsername || cleanUsername.length > 20) {
      return { error: 'Nome inválido. Deve ter entre 1 e 20 caracteres.' };
    }

    const user = { id: socketId, username: cleanUsername, room };
    this.users.set(socketId, user);
    return { user };
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

  getRoomUsers(room = 'resenha') {
    return Array.from(this.users.values()).filter(u => u.room === room);
  }

  addMessage(socketId, text, room = 'resenha') {
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
      timestamp: new Date().toISOString()
    };

    this.messages.push(message);
    if (this.messages.length > this.MAX_MESSAGES) {
      this.messages.shift();
    }

    return { message };
  }

  getRecentMessages() {
    return this.messages;
  }
}

export const chatService = new ChatService();