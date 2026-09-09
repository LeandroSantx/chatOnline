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
  const defaultRoom = 'Geral';

  // 1. Entrada Inicial do Usuário
  socket.on('user:join', ({ username, room }, callback) => {
    const targetRoom = room || defaultRoom;
    const { user, error } = chatService.addUser(socket.id, username, targetRoom);

    if (error) {
      return callback && callback({ success: false, error });
    }

    socket.join(targetRoom);

    // Envia histórico da sala atual
    socket.emit('message:history', chatService.getRecentMessages(targetRoom));

    // Notifica outros usuários da sala
    const systemMsg = {
      id: `${Date.now()}-sys`,
      type: 'system',
      text: `${user.username} entrou na sala ${targetRoom}.`
    };
    socket.to(targetRoom).emit('message:receive', systemMsg);

    // Atualiza lista de usuários da sala
    io.to(targetRoom).emit('users:update', chatService.getRoomUsers(targetRoom));

    if (callback) callback({ success: true });
  });

  // 2. Troca de Sala Privada / Canal
  socket.on('room:join', ({ room }) => {
    const user = chatService.getUser(socket.id);
    if (!user || !room) return;

    const oldRoom = user.room;
    const newRoom = room.trim();

    if (oldRoom === newRoom) return;

    // Sai da sala anterior no Socket.io e atualiza no serviço
    socket.leave(oldRoom);
    socket.join(newRoom);
    chatService.updateUserRoom(socket.id, newRoom);

    // Notifica saída da sala antiga
    const exitMsg = {
      id: `${Date.now()}-sys`,
      type: 'system',
      text: `${user.username} saiu da sala.`
    };
    socket.to(oldRoom).emit('message:receive', exitMsg);
    io.to(oldRoom).emit('users:update', chatService.getRoomUsers(oldRoom));

    // Notifica entrada na nova sala
    const enterMsg = {
      id: `${Date.now()}-sys`,
      type: 'system',
      text: `${user.username} entrou na sala.`
    };
    socket.to(newRoom).emit('message:receive', enterMsg);
    io.to(newRoom).emit('users:update', chatService.getRoomUsers(newRoom));

    // Envia o histórico da nova sala para quem trocou
    socket.emit('message:history', chatService.getRecentMessages(newRoom));
  });

  // 3. Envio de Mensagem por Sala
  socket.on('message:send', ({ text, room }) => {
    if (isRateLimited(socket.id)) {
      return socket.emit('error', { message: 'Você está enviando mensagens muito rápido.' });
    }

    const user = chatService.getUser(socket.id);
    const targetRoom = room || user?.room || defaultRoom;

    const { message, error } = chatService.addMessage(socket.id, text, targetRoom);
    if (error) {
      return socket.emit('error', { message: error });
    }

    // Emite apenas para a sala especificada
    io.to(targetRoom).emit('message:receive', message);
  });

  // 4. Indicador de Digitação direcionado à Sala
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

  // 5. Desconexão
  socket.on('disconnect', () => {
    const user = chatService.removeUser(socket.id);
    rateLimits.delete(socket.id);

    if (user) {
      const systemMsg = {
        id: `${Date.now()}-sys`,
        type: 'system',
        text: `${user.username} saiu do chat.`
      };
      io.to(user.room).emit('message:receive', systemMsg);
      io.to(user.room).emit('users:update', chatService.getRoomUsers(user.room));
    }
  });
};