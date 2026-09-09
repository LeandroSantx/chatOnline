import { useState } from 'react';

export const ChatHeader = ({ users, isConnected, currentRoom, onSwitchRoom }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [roomInput, setRoomInput] = useState('');

  const handleSwitch = (e) => {
    e.preventDefault();
    if (roomInput.trim()) {
      onSwitchRoom(roomInput.trim());
      setRoomInput('');
      setIsDrawerOpen(false); // Fecha o menu ao trocar de sala
    }
  };

  return (
    <>
      <header className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="menu-btn"
            aria-label="Abrir Menu"
          >
            ☰
          </button>
          <h2>
            RESENHA <small style={{ fontSize: '0.85rem', color: 'var(--accent)' }}>#{currentRoom}</small>
          </h2>
        </div>

        <div className="header-status">
          <span
            className="online-dot"
            style={{ backgroundColor: isConnected ? 'var(--success)' : 'var(--danger)' }}
          />
          <span>{users.length} online</span>
        </div>
      </header>

      {/* Gaveta Lateral Retrátil (Drawer Mobile/Desktop) */}
      {isDrawerOpen && (
        <div className="drawer-overlay" onClick={() => setIsDrawerOpen(false)}>
          <aside className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>Menu do Chat</h3>
              <button className="close-btn" onClick={() => setIsDrawerOpen(false)}>✕</button>
            </div>

            {/* Troca/Criação de Sala */}
            <div className="drawer-section">
              <h4>Trocar de Sala</h4>
              <form onSubmit={handleSwitch} style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <input
                  type="text"
                  placeholder="Nome da sala..."
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value)}
                />
                <button type="submit">Entrar</button>
              </form>
            </div>

            {/* Lista de Usuários na Sala */}
            <div className="drawer-section">
              <h4>Pessoas Online ({users.length})</h4>
              <ul className="drawer-user-list">
                {users.map((u) => (
                  <li key={u.id}>
                    <span className="online-dot" style={{ width: 8, height: 8 }} />
                    {u.username}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};