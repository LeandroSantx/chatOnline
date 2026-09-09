import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { registerChatHandlers } from './socket/chatHandler.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 3001;

// Permite conexões do Vite (seja via localhost, IP local ou porta dinâmica)
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.CLIENT_ORIGIN
].filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  // Suporte garantido aos dois transportes do Socket.io
  transports: ['websocket', 'polling']
});

io.on('connection', (socket) => {
  registerChatHandlers(io, socket);
});

httpServer.listen(PORT, () => {
  console.log(`[RESENHA Server] Rodando na porta ${PORT}`);
});