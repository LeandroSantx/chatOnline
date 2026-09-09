import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const generateNumericRoomId = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

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

  // Estados de Amizade
  const [friendSearch, setFriendSearch] = useState('')
  const [pendingRequests, setPendingRequests] = useState([])
  const [acceptedFriends, setAcceptedFriends] = useState([])
  const [friendStatusMsg, setFriendStatusMsg] = useState('')
  const [myUserId, setMyUserId] = useState('')

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

  useEffect(() => {
    const storageKey = getStorageKey()
    localStorage.setItem(storageKey, JSON.stringify(roomsList))
  }, [roomsList])

  useEffect(() => {
    if (isMenuOpen) {
      loadFriendshipsData()
    }
  }, [isMenuOpen])

  const loadFriendshipsData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setMyUserId(user.id)

    // Busca amizades do usuário
    const { data: friendships } = await supabase
      .from('friendships')
      .select('id, status, user_id, friend_id')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)

    if (!friendships) return

    // Separa os pendentes recebidos
    const pendingList = []
    const acceptedList = []

    for (const f of friendships) {
      const otherId = f.user_id === user.id ? f.friend_id : f.user_id
      
      // Busca o perfil da outra pessoa
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', otherId)
        .maybeSingle()

      const friendObj = {
        friendshipId: f.id,
        userId: otherId,
        username: profile?.username || 'Usuário'
      }

      if (f.status === 'pending') {
        // Apenas exibe na pendência se a solicitação foi enviada PARA MIM
        if (f.friend_id === user.id) {
          pendingList.push(friendObj)
        }
      } else if (f.status === 'accepted') {
        acceptedList.push(friendObj)
      }
    }

    setPendingRequests(pendingList)
    setAcceptedFriends(acceptedList)
  }

  const handleAddFriend = async (e) => {
    e.preventDefault()
    const query = friendSearch.trim()
    if (!query) return

    setFriendStatusMsg('Buscando...')
    const { data: { user } } = await supabase.auth.getUser()

    // Permite buscar por Username OU por ID (UUID)
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id, username')
      .or(`username.eq.${query},id.eq.${query}`)
      .maybeSingle()

    if (!targetUser) {
      setFriendStatusMsg('Usuário não encontrado.')
      return
    }

    if (targetUser.id === user.id) {
      setFriendStatusMsg('Você não pode adicionar a si mesmo.')
      return
    }

    const { error: insertError } = await supabase
      .from('friendships')
      .insert([{ user_id: user.id, friend_id: targetUser.id, status: 'pending' }])

    if (insertError) {
      setFriendStatusMsg('Solicitação já existente.')
    } else {
      setFriendStatusMsg('Pedido enviado!')
      setFriendSearch('')
      loadFriendshipsData()
    }
  }

  const handleRespondRequest = async (friendshipId, accept) => {
    if (accept) {
      await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId)
    } else {
      await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId)
    }
    loadFriendshipsData()
  }

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

  const handleRemoveRoom = async (e, roomId) => {
    e.stopPropagation()

    if (!window.confirm('Tem certeza de que deseja apagar esta sala definitivamente?')) {
      return
    }

    try {
      await fetch(`http://localhost:3001/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.warn('Backend offline. Deletando apenas localmente:', error)
    }

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
          style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}
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
          color: '#fff',
          overflowY: 'auto'
        }}>
          <div className="drawer-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>Navegação</h3>
            <button 
              className="close-btn" 
              onClick={() => setIsMenuOpen(false)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          {/* Meu ID */}
          {myUserId && (
            <div style={{ backgroundColor: '#111827', padding: '8px 10px', borderRadius: '6px', marginBottom: '15px', fontSize: '0.75rem', color: '#9ca3af' }}>
              Seu ID: <span style={{ color: '#818cf8', fontWeight: 'bold' }}>{myUserId.substring(0, 8)}...</span>
              <button 
                onClick={() => navigator.clipboard.writeText(myUserId)} 
                style={{ marginLeft: '6px', background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.7rem' }}
                title="Copiar ID Completo"
              >
                📋 Copiar
              </button>
            </div>
          )}

          {/* Solicitações Pendentes */}
          {pendingRequests.length > 0 && (
            <div className="drawer-section" style={{ marginBottom: '15px', backgroundColor: '#312e81', padding: '10px', borderRadius: '8px' }}>
              <h4 style={{ fontSize: '0.8rem', color: '#a5b4fc', margin: '0 0 8px 0' }}>SOLICITAÇÕES DE AMIZADE ({pendingRequests.length})</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {pendingRequests.map((p) => (
                  <li key={p.friendshipId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.85rem' }}>
                    <span>{p.username}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => handleRespondRequest(p.friendshipId, true)} style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer' }}>✓</button>
                      <button onClick={() => handleRespondRequest(p.friendshipId, false)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer' }}>✕</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Minhas Salas */}
          <div className="drawer-section" style={{ marginBottom: '15px' }}>
            <h4 style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '8px' }}>MINHAS SALAS</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 10px 0', maxHeight: '120px', overflowY: 'auto' }}>
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

          {/* Adicionar Amigos */}
          <div className="drawer-section" style={{ marginBottom: '15px' }}>
            <h4 style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '8px' }}>ADICIONAR AMIGO (NOME OU ID)</h4>
            <form onSubmit={handleAddFriend} style={{ display: 'flex', gap: '5px' }}>
              <input
                type="text"
                placeholder="Nome ou ID"
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #374151', backgroundColor: '#111827', color: '#fff', fontSize: '0.85rem' }}
              />
              <button 
                type="submit"
                style={{ padding: '8px 12px', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                +
              </button>
            </form>
            {friendStatusMsg && (
              <span style={{ fontSize: '0.75rem', color: '#818cf8', display: 'block', marginTop: '4px' }}>
                {friendStatusMsg}
              </span>
            )}
          </div>

          {/* Lista de Amigos Aceitos */}
          {acceptedFriends.length > 0 && (
            <div className="drawer-section" style={{ marginBottom: '15px' }}>
              <h4 style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '8px' }}>MEUS AMIGOS ({acceptedFriends.length})</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {acceptedFriends.map((f) => (
                  <li key={f.userId} style={{ padding: '4px 0', fontSize: '0.85rem', color: '#cbd5e1' }}>
                    👤 {f.username}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Entrar por ID */}
          <div className="drawer-section" style={{ marginBottom: '15px' }}>
            <h4 style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '8px' }}>ENTRAR POR ID</h4>
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

          {/* Usuários Online na Sala */}
          <div className="drawer-section" style={{ flex: 1, minHeight: '80px' }}>
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