class ChatService {
  constructor() {
    this.users = new Map();
    this.messages = new Map();
  }

  addUser(socketId, username, room, userId) {
    const user = { socketId, username, room, userId };
    this.users.set(socketId, user);
    return { user };
  }

  getUser(socketId) {
    return this.users.get(socketId);
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

  getRoomUsers(room) {
    return Array.from(this.users.values()).filter(u => u.room === room);
  }

  addMessage(socketId, text, room, replyTo) {
    const user = this.getUser(socketId);
    if (!user) return { error: 'Usuário não encontrado.' };

    const message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      senderId: user.socketId,
      userId: user.userId,
      username: user.username,
      text,
      room,
      replyTo,
      createdAt: new Date().toISOString()
    };

    if (!this.messages.has(room)) {
      this.messages.set(room, []);
    }
    this.messages.get(room).push(message);

    return { message };
  }

  editMessage(socketId, messageId, newText) {
    const user = this.getUser(socketId);
    if (!user) return { error: 'Usuário não encontrado.' };

    const roomMessages = this.messages.get(user.room) || [];
    const message = roomMessages.find(m => m.id === messageId);

    if (!message) return { error: 'Mensagem não encontrada.' };
    
    if (message.senderId !== socketId && message.userId !== user.userId) {
      return { error: 'Sem permissão para editar esta mensagem.' };
    }

    message.text = newText;
    message.editedAt = new Date().toISOString();

    return { message };
  }

  deleteMessage(socketId, messageId) {
    const user = this.getUser(socketId);
    if (!user) return { error: 'Usuário não encontrado.' };

    const roomMessages = this.messages.get(user.room) || [];
    const index = roomMessages.findIndex(m => m.id === messageId);

    if (index === -1) return { error: 'Mensagem não encontrada.' };

    const message = roomMessages[index];
    
    if (message.senderId !== socketId && message.userId !== user.userId) {
      return { error: 'Sem permissão para deletar esta mensagem.' };
    }

    roomMessages.splice(index, 1);

    return { success: true, room: user.room };
  }

  getRecentMessages(room) {
    return this.messages.get(room) || [];
  }
}

export const chatService = new ChatService();