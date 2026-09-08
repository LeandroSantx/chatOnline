import { useState } from 'react';
import { useSocket } from './hooks/useSocket';
import { LoginScreen } from './components/LoginScreen';
import { ChatHeader } from './components/ChatHeader';
import { MessageList } from './components/MessageList';
import { MessageInput } from './components/MessageInput';

export default function App() {
  const [joined, setJoined] = useState(false);
  const {
    socketId,
    isConnected,
    messages,
    users,
    typingUsers,
    error,
    joinChat,
    sendMessage,
    setTyping
  } = useSocket();

  const handleJoin = (username, callback) => {
    joinChat(username, (response) => {
      if (response.success) {
        setJoined(true);
      }
      if (callback) callback(response);
    });
  };

  if (!joined) {
    return (
      <div className="app-container">
        <LoginScreen onJoin={handleJoin} />
      </div>
    );
  }

  return (
    <div className="app-container">
      {error && <div className="error-banner">{error}</div>}
      {!isConnected && (
        <div className="error-banner" style={{ background: '#eab308', color: '#000' }}>
          Conexão perdida. Reconectando ao servidor...
        </div>
      )}
      <ChatHeader users={users} isConnected={isConnected} />
      <MessageList
        messages={messages}
        currentSocketId={socketId}
        typingUsers={typingUsers}
      />
      <MessageInput onSendMessage={sendMessage} onTyping={setTyping} />
    </div>
  );
}