import { useState, useEffect } from 'react'

// Função para gerar ID único numérico de 6 dígitos
const generateNumericRoomId = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Obtém ou cria uma chave única no navegador para manter a lista salva
const getStorageKey = () => {
  let key = localStorage.getItem('resenha_user_session_id')
  if (!key) {
    key = `user_${Math.random().toString(36).substring(2, 9)}`
    localStorage.setItem('resenha_user_session_id', key)
  }
  return `user_rooms_${key}`
}

export const ChatHeader = ({ currentRoom, users, isConnected, onSwitchRoom, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [roomInput, setRoomInput] = useState('')
  const [newRoomName, setNewRoomName] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Carrega as salas salvas no localStorage
  const [roomsList, setRoomsList] = useState(() => {
    const storageKey = getStorageKey()
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Erro ao ler salas do localStorage', e)
      }
    }
    return [{ id: '100000', name: 'Geral' }]
  })

  // Salva no localStorage a cada atualização das salas
  useEffect(() => {
    const storageKey = getStorageKey()
    localStorage.setItem(storageKey, JSON.stringify(roomsList))
  }, [roomsList])

  const handleJoinRoom = (e) => {
    e?.preventDefault()
    const targetId = roomInput.trim()
    if (targetId) {
      if (!roomsList.some(r => r.id === targetId)) {
        setRoomsList(prev => [...prev, { id: targetId, name: `Sala ${targetId}` }])
      }
      onSwitchRoom(targetId)
      setRoomInput('')
      setIsMenuOpen(false)
    }
  }

  const handleCreatePrivateRoom = (e) => {
    e.preventDefault()
    if (!newRoomName.trim()) return

    const roomId = generateNumericRoomId()
    const newRoomObj = { id: roomId, name: newRoomName.trim() }

    setRoomsList(prev => [...prev, newRoomObj])
    onSwitchRoom(roomId)
    setNewRoomName('')
    setShowCreateModal(false)
    setIsMenuOpen(false)
  }

  // Deleta a sala no backend (porta 3001) e atualiza a interface local
  const handleRemoveRoom = async (e, roomId) => {
    e.stopPropagation()

    if (!window.confirm('Tem certeza de que deseja apagar esta sala definitivamente?')) {
      return
    }

    try {
      // Chamada ajustada para a porta 3001
      const response = await fetch(`http://localhost:3001/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.warn('Backend retornou erro ao deletar:', errorData.error)
      }
    } catch (error) {
      console.warn('Backend inacessível ou offline. Deletando apenas localmente:', error)
    }

    // Atualiza a interface e a memória local do navegador
    const updatedList = roomsList.filter(r => r.id !== roomId)
    setRoomsList(updatedList)

    if (currentRoom === roomId) {
      const fallbackRoom = updatedList[0]?.id || '100000'
      onSwitchRoom(fallbackRoom)
    }
  }

  const currentRoomObj = roomsList.find(r => r.id === currentRoom) || { id: currentRoom, name: currentRoom }

  return (
    <div className="chat-header-container">
      <header className="chat-header" style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 20px',
        backgroundColor: '#1f2937',
        color: '#fff',
        gap: '15px'
      }}>
        <button 
          className="menu-toggle" 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: '1.5rem',
            cursor: 'pointer'
          }}
        >
          ☰
        </button>

        <div className="header-info" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>RESENHA</h2>
          <span className="room-badge" style={{ backgroundColor: '#374151', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold' }}>
            #{currentRoomObj.name}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
            (ID: {currentRoomObj.id})
          </span>
          <span className={`status-indicator ${isConnected ? 'online' : ''}`} style={{ fontSize: '0.85rem', color: isConnected ? '#4ade80' : '#f87171' }}>
            ● {users.length} online
          </span>
        </div>
      </header>

      {isMenuOpen && (
        <aside className="sidebar-drawer" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '280px',
          height: '100vh',
          backgroundColor: '#1f2937',
          zIndex: 1000,
          padding: '20px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '4px 0 10px rgba(0,0,0,0.5)',
          color: '#fff'
        }}>
          <div className="drawer-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>Navegação</h3>
            <button 
              className="close-btn" 
              onClick={() => setIsMenuOpen(false)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          <div className="drawer-section" style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '8px' }}>MINHAS SALAS</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 10px 0', maxHeight: '140px', overflowY: 'auto' }}>
              {roomsList.map((r, index) => (
                <li key={r.id} style={{ marginBottom: '4px' }}>
                  <div
                    onClick={() => {
                      onSwitchRoom(r.id)
                      setIsMenuOpen(false)
                    }}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      backgroundColor: r.id === currentRoom ? '#4f46e5' : '#374151',
                      color: '#fff',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
                      <span># {r.name}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>{r.id}</span>
                      {index !== 0 && (
                        <button
                          onClick={(e) => handleRemoveRoom(e, r.id)}
                          title="Remover sala"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#f87171',
                            cursor: 'pointer',
                            padding: '0 2px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            lineHeight: 1
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#374151',
                color: '#818cf8',
                border: '1px dashed #6366f1',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 'bold'
              }}
            >
              + Criar Nova Sala
            </button>
          </div>

          <div className="drawer-section" style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '8px' }}>ENTRAR POR ID (6 DÍGITOS)</h4>
            <form onSubmit={handleJoinRoom} style={{ display: 'flex', gap: '5px' }}>
              <input
                type="text"
                placeholder="Ex: 839201"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #374151', backgroundColor: '#111827', color: '#fff', fontSize: '0.85rem' }}
              />
              <button 
                type="submit"
                style={{ padding: '8px 12px', backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Entrar
              </button>
            </form>
          </div>

          <div className="drawer-section" style={{ flex: 1, overflowY: 'auto' }}>
            <h4 style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '8px' }}>ONLINE NESTA SALA ({users.length})</h4>
            <ul className="user-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {users.map((u, i) => (
                <li key={i} style={{ padding: '6px 0', fontSize: '0.9rem' }}>
                  🟢 {u.username}
                </li>
              ))}
            </ul>
          </div>

          <div className="drawer-footer" style={{ marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid #374151' }}>
            <button 
              onClick={onLogout}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Sair da Conta
            </button>
          </div>
        </aside>
      )}

      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            padding: '20px',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '380px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            color: '#fff'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '1.1rem' }}>Criar Nova Sala</h3>
            <form onSubmit={handleCreatePrivateRoom}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' }}>
                Nome da Sala:
              </label>
              <input
                type="text"
                placeholder="Ex: Grupo de Projetos"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  marginBottom: '15px',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: '#475569',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newRoomName.trim()}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: newRoomName.trim() ? '#4f46e5' : '#334155',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: newRoomName.trim() ? 'pointer' : 'not-allowed'
                  }}
                >
                  Criar Sala
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}