import { useState } from 'react';

export const LoginScreen = ({ onJoin }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Informe seu nome para continuar.');
      return;
    }
    if (username.length > 20) {
      setError('O nome deve ter no máximo 20 caracteres.');
      return;
    }
    onJoin(username.trim(), (response) => {
      if (!response.success) {
        setError(response.error);
      }
    });
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1>RESENHA</h1>
        <p>Chat privado dos manos</p>
        <form onSubmit={handleSubmit} className="input-group">
          <input
            type="text"
            placeholder="Seu nome ou apelido"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
            autoFocus
          />
          {error && <span style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</span>}
          <button type="submit">ENTRAR NO CHAT</button>
        </form>
      </div>
    </div>
  );
};