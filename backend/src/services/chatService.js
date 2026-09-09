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

  addMessage(socketId, text, room = 'Geral', replyTo = null) {
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
      room: room,
      timestamp: new Date().toISOString(),
      isEdited: false,
      replyTo: replyTo ? { id: replyTo.id, username: replyTo.username, text: replyTo.text } : null
    };

    this.messages.push(message);
    if (this.messages.length > this.MAX_MESSAGES) {
      this.messages.shift();
    }

    return { message };
  }

  editMessage(socketId, messageId, newText) {
    const user = this.getUser(socketId);
    const message = this.messages.find(m => m.id === messageId);

    if (!message) return { error: 'Mensagem não encontrada.' };
    if (message.userId !== user?.id) return { error: 'Você só pode editar suas próprias mensagens.' };

    const cleanText = sanitizeInput(newText);
    if (!cleanText || cleanText.length > 500) {
      return { error: 'Mensagem inválida.' };
    }

    message.text = cleanText;
    message.isEdited = true;

    return { message };
  }

  deleteMessage(socketId, messageId) {
    const user = this.getUser(socketId);
    const index = this.messages.findIndex(m => m.id === messageId);

    if (index === -1) return { error: 'Mensagem não encontrada.' };

    const message = this.messages[index];
    if (message.userId !== user?.id) return { error: 'Você só pode excluir suas próprias mensagens.' };

    this.messages.splice(index, 1);
    return { success: true, messageId, room: message.room };
  }

  getRecentMessages(room = 'Geral') {
    return this.messages.filter(msg => msg.room === room);
  }
}

export const chatService = new ChatService();