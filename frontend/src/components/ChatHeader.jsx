import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { socket } from '../hooks/useSocket'

const generateNumericRoomId = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export const ChatHeader = ({ currentRoom, users, isConnected, onSwitchRoom, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [roomInput, setRoomInput] = useState('')
  const [newRoomName, setNewRoomName] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [roomToDelete, setRoomToDelete] = useState(null)

  // Estados de Amizade
  const [friendSearch, setFriendSearch] = useState('')
  const [pendingRequests, setPendingRequests] = useState([])
  const [acceptedFriends, setAcceptedFriends] = useState([])
  const [friendStatusMsg, setFriendStatusMsg] = useState('')
  const [myUserId, setMyUserId] = useState('')

  // Lista de salas vindas do Supabase
  const [roomsList, setRoomsList] = useState([{ id: '100000', name: 'Geral' }])

  useEffect(() => {
    if (isMenuOpen) {
      loadFriendshipsData()
      loadUserRooms()
    }
  }, [isMenuOpen])

  // Busca as salas do usuário no Supabase
  const loadUserRooms = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: userMemberships } = await supabase
      .from('room_members')
      .select('room_id, rooms(id, name)')
      .eq('user_id', user.id)

    const defaultRoom = { id: '100000', name: 'Geral' }

    if (!userMemberships || userMemberships.length === 0) {
      setRoomsList([defaultRoom])
      return
    }

    const fetchedRooms = userMemberships
      .map(m => m.rooms)
      .filter(Boolean)

    if (!fetchedRooms.some(r => r.id === '100000')) {
      fetchedRooms.unshift(defaultRoom)
    }

    setRoomsList(fetchedRooms)
  }

  // Carrega lista de amigos e solicitações
  const loadFriendshipsData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setMyUserId(user.id)

    const { data: friendships } = await supabase
      .from('friendships')
      .select('id, status, user_id, friend_id')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)

    if (!friendships) return

    const pendingList = []
    const acceptedList = []

    for (const f of friendships) {
      const otherId = f.user_id === user.id ? f.friend_id : f.user_id
      
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

  // Adicionar amigo com verificação estrita de username/ID
  const handleAddFriend = async (e) => {
    e.preventDefault()
    let query = friendSearch.trim()
    if (!query) return

    if (query.startsWith('@')) {
      query = query.substring(1)
    }

    setFriendStatusMsg('Buscando...')
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Busca estrita por username
    let { data: targetUser } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', query)
      .maybeSingle()

    // 2. Se não achou, busca por ID UUID
    if (!targetUser) {
      const { data: userById } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', query)
        .maybeSingle()

      targetUser = userById
    }

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
      setFriendStatusMsg(`Pedido enviado para ${targetUser.username}!`)
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

  // Entrar por ID e salvar o vínculo no Supabase
  const handleJoinRoom = async (e) => {
    e?.preventDefault()
    const targetId = roomInput.trim()
    if (!targetId) return

    const { data: { user } } = await supabase.auth.getUser()

    const { data: roomData } = await supabase
      .from('rooms')
      .select('id, name')
      .eq('id', targetId)
      .maybeSingle()

    if (roomData && user) {
      await supabase
        .from('room_members')
        .upsert([{ user_id: user.id, room_id: targetId }])
    }

    await loadUserRooms()
    onSwitchRoom(targetId)
    setRoomInput('')
    setIsMenuOpen(false)
  }

  // Criar nova sala e vincular ao usuário no Supabase
  const handleCreatePrivateRoom = async (e) => {
    e.preventDefault()
    if (!newRoomName.trim()) return

    const { data: { user } } = await supabase.auth.getUser()
    const roomId = generateNumericRoomId()
    const name = newRoomName.trim()

    const { error: roomError } = await supabase
      .from('rooms')
      .insert([{ id: roomId, name: name }])

    if (roomError) {
      setFriendStatusMsg('Erro ao salvar sala no banco.')
      return
    }

    await supabase
      .from('room_members')
      .insert([{ user_id: user.id, room_id: roomId }])

    if (socket && socket.connected) {
      socket.emit('room:create', { room: roomId, roomName: name })
    }

    await loadUserRooms()
    onSwitchRoom(roomId)
    setNewRoomName('')
    setShowCreateModal(false)
    setIsMenuOpen(false)
  }

  const handleRemoveRoom = (e, roomId) => {
    e.stopPropagation()
    setRoomToDelete(roomId)
  }

  // Desvincular sala do usuário
  const confirmDeleteRoom = async () => {
    if (!roomToDelete) return

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      await supabase
        .from('room_members')
        .delete()
        .eq('user_id', user.id)
        .eq('room_id', roomToDelete)
    }

    await loadUserRooms()

    if (currentRoom === roomToDelete) {
      onSwitchRoom('100000')
    }

    setRoomToDelete(null)
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
                onClick={() => {
                  navigator.clipboard.writeText(myUserId)
                  setFriendStatusMsg('ID copiado!')
                }} 
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

      {/* Modal: Criar Nova Sala */}
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

      {/* Modal: Confirmar Exclusão de Sala */}
      {roomToDelete && (
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
            <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '1.1rem', color: '#f87171' }}>Apagar Sala</h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '20px' }}>
              Tem certeza de que deseja apagar esta sala definitivamente?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setRoomToDelete(null)}
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
                onClick={confirmDeleteRoom}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}