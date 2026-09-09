import { chatService } from '../services/chatService.js';

const rateLimits = new Map();

const isRateLimited = (socketId) => {
  const now = Date.now();
  const userLimit = rateLimits.get(socketId) || { count: 0, lastReset: now };

  if (now - userLimit.lastReset > 2000) {
    userLimit.count = 1;
    userLimit.lastReset = now;
  } else {
    userLimit.count += 1;
  }

  rateLimits.set(socketId, userLimit);
  return userLimit.count > 5;
};

export const registerChatHandlers = (io, socket) => {
  const defaultRoom = '100000';

  // 1. Entrada Inicial do Usuário
  socket.on('user:join', ({ username, userId, room }, callback) => {
    const targetRoom = room || defaultRoom;
    const { user, error } = chatService.addUser(socket.id, username, targetRoom, userId);

    if (error) {
      return callback && callback({ success: false, error });
    }

    // Cria as salas pessoais do usuário no Socket.io para receber convites/mensagens diretas
    socket.join(`user:${username}`);
    socket.join(`user:${userId}`);
    socket.join(targetRoom);

    socket.emit('message:history', chatService.getRecentMessages(targetRoom));
    io.to(targetRoom).emit('users:update', chatService.getRoomUsers(targetRoom));

    if (callback) callback({ success: true });
  });

  // 2. Troca de Sala Privada / Canal (notifica o amigo se for PV)
  socket.on('room:join', ({ room, targetUser, targetUserId }) => {
    const user = chatService.getUser(socket.id);
    if (!user || !room) return;

    const oldRoom = user.room;
    const newRoom = room.trim();

    if (oldRoom === newRoom) return;

    socket.leave(oldRoom);
    socket.join(newRoom);
    chatService.updateUserRoom(socket.id, newRoom);

    const isPublic = newRoom === '100000' || newRoom.toLowerCase() === 'geral';

    // Notifica o outro usuário para entrar na mesma sala em tempo real
    if (!isPublic) {
      if (targetUser) io.to(`user:${targetUser}`).emit('room:invite', { room: newRoom, from: user.username });
      if (targetUserId) io.to(`user:${targetUserId}`).emit('room:invite', { room: newRoom, from: user.username });
    }

    io.to(oldRoom).emit('users:update', chatService.getRoomUsers(oldRoom));
    io.to(newRoom).emit('users:update', chatService.getRoomUsers(newRoom));

    socket.emit('message:history', chatService.getRecentMessages(newRoom));
  });

  // 3. Envio de Mensagem
  socket.on('message:send', ({ text, room, replyTo, userId }) => {
    if (isRateLimited(socket.id)) {
      return socket.emit('error', { message: 'Você está enviando mensagens muito rápido.' });
    }

    const user = chatService.getUser(socket.id);
    const targetRoom = room || user?.room || defaultRoom;

    const { message, error } = chatService.addMessage(socket.id, text, targetRoom, replyTo);
    if (error) {
      return socket.emit('error', { message: error });
    }

    if (userId) {
      message.userId = userId;
    }

    io.to(targetRoom).emit('message:receive', message);
  });

  // 4. Edição de Mensagem
  socket.on('message:edit', ({ messageId, newText }) => {
    const { message, error } = chatService.editMessage(socket.id, messageId, newText);
    if (error) {
      return socket.emit('error', { message: error });
    }

    io.to(message.room).emit('message:updated', message);
  });

  // 5. Exclusão de Mensagem
  socket.on('message:delete', ({ messageId }) => {
    const { success, room, error } = chatService.deleteMessage(socket.id, messageId);
    if (error) {
      return socket.emit('error', { message: error });
    }

    if (success) {
      io.to(room).emit('message:deleted', { messageId });
    }
  });

  // 6. Indicadores de Digitação
  socket.on('typing:start', ({ room }) => {
    const user = chatService.getUser(socket.id);
    const targetRoom = room || user?.room || defaultRoom;
    if (user) {
      socket.to(targetRoom).emit('typing:update', { username: user.username, isTyping: true });
    }
  });

  socket.on('typing:stop', ({ room }) => {
    const user = chatService.getUser(socket.id);
    const targetRoom = room || user?.room || defaultRoom;
    if (user) {
      socket.to(targetRoom).emit('typing:update', { username: user.username, isTyping: false });
    }
  });

  // 7. Desconexão
  socket.on('disconnect', () => {
    const user = chatService.removeUser(socket.id);
    rateLimits.delete(socket.id);

    if (user) {
      io.to(user.room).emit('users:update', chatService.getRoomUsers(user.room));
    }
  });
};