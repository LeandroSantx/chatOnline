export const ChatHeader = ({ users, isConnected }) => {
  return (
    <header className="chat-header">
      <div>
        <h2>RESENHA</h2>
        <div className="user-tags">
          {users.map((u) => (
            <span key={u.id} className="user-tag">
              🟢 {u.username}
            </span>
          ))}
        </div>
      </div>
      <div className="header-status">
        <span
          className="online-dot"
          style={{ backgroundColor: isConnected ? 'var(--success)' : 'var(--danger)' }}
        />
        <span>{users.length} online</span>
      </div>
    </header>
  );
};