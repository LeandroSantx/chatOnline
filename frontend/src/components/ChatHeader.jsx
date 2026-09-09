import { useState } from 'react';

export const ChatHeader = ({ users, isConnected, currentRoom, onSwitchRoom }) => {
  const [roomInput, setRoomInput] = useState('');

  const handleSwitch = (e) => {
    e.preventDefault();
    if (roomInput.trim()) {
      onSwitchRoom(roomInput.trim());
      setRoomInput('');
    }
  };

  return (
    <header className="chat-header">
      <div>
        <h2>RESENHA <small style={{ fontSize: '0.8rem', opacity: 0.7 }}>#{currentRoom}</small></h2>
        <div className="user-tags">
          {users.map((u) => (
            <span key={u.id} className="user-tag">
              🟢 {u.username}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <form onSubmit={handleSwitch} style={{ display: 'flex', gap: '5px' }}>
          <input
            type="text"
            placeholder="Nome da sala..."
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #333',
              background: '#1a1a1a',
              color: '#fff',
              fontSize: '0.8rem'
            }}
          />
          <button
            type="submit"
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              background: '#6366f1',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            Entrar
          </button>
        </form>

        <div className="header-status">
          <span
            className="online-dot"
            style={{ backgroundColor: isConnected ? 'var(--success)' : 'var(--danger)' }}
          />
          <span>{users.length} online</span>
        </div>
      </div>
    </header>
  );
};