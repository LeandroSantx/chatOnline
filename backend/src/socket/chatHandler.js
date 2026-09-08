import { chatService } from '../services/chatService.js';

// Rate Limiter simples baseado em memória
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
  return userLimit.count > 5; // Máximo 5 mensagens a cada 2 segundos
};

export const registerChatHandlers = (io, socket) => {
  const defaultRoom = 'resenha';

  // Entrada na sala
  socket.on('user:join', ({ username }, callback) => {
    const { user, error } = chatService.addUser(socket.id, username, defaultRoom);

    if (error) {
      return callback && callback({ success: false, error });
    }

    socket.join(defaultRoom);

    // Envia histórico atual para o novo usuário
    socket.emit('message:history', chatService.getRecentMessages());

    // Notifica outros usuários da sala
    const systemMsg = {
      id: `${Date.now()}-sys`,
      type: 'system',
      text: `${user.username} entrou no chat.`
    };
    socket.to(defaultRoom).emit('message:receive', systemMsg);

    // Atualiza lista global de usuários da sala
    io.to(defaultRoom).emit('users:update', chatService.getRoomUsers(defaultRoom));

    if (callback) callback({ success: true });
  });

  // Envio de mensagem
  socket.on('message:send', ({ text }) => {
    if (isRateLimited(socket.id)) {
      return socket.emit('error', { message: 'Você está enviando mensagens muito rápido.' });
    }

    const { message, error } = chatService.addMessage(socket.id, text, defaultRoom);
    if (error) {
      return socket.emit('error', { message: error });
    }

    io.to(defaultRoom).emit('message:receive', message);
  });

  // Evento opcional: Indicador de digitação
  socket.on('typing:start', () => {
    const user = chatService.getUser(socket.id);
    if (user) {
      socket.to(defaultRoom).emit('typing:update', { username: user.username, isTyping: true });
    }
  });

  socket.on('typing:stop', () => {
    const user = chatService.getUser(socket.id);
    if (user) {
      socket.to(defaultRoom).emit('typing:update', { username: user.username, isTyping: false });
    }
  });

  // Desconexão
  socket.on('disconnect', () => {
    const user = chatService.removeUser(socket.id);
    rateLimits.delete(socket.id);

    if (user) {
      const systemMsg = {
        id: `${Date.now()}-sys`,
        type: 'system',
        text: `${user.username} saiu do chat.`
      };
      io.to(defaultRoom).emit('message:receive', systemMsg);
      io.to(defaultRoom).emit('users:update', chatService.getRoomUsers(defaultRoom));
    }
  });
};