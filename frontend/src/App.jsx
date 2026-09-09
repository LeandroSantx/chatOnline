import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import LoginScreen from './components/LoginScreen'
import { ChatHeader } from './components/ChatHeader'
import { MessageList } from './components/MessageList'
import { MessageInput } from './components/MessageInput'
import { useSocket } from './hooks/useSocket'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [currentRoom, setCurrentRoom] = useState('100000') // Inicia por padrão na sala Geral (ID: 100000)
  const [replyTo, setReplyTo] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (currentSession) => {
    if (!currentSession?.user?.id) return
    const userId = currentSession.user.id

    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .maybeSingle()

    if (data && data.username) {
      setProfile(data)
    } else {
      const metaName = currentSession.user.user_metadata?.display_name
      const defaultUsername = metaName || currentSession.user.email?.split('@')[0] || 'Usuário'
      await supabase.from('profiles').upsert([{ id: userId, username: defaultUsername }])
      setProfile({ username: defaultUsername })
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  const username = profile?.username || session?.user?.user_metadata?.display_name || session?.user?.email?.split('@')[0] || 'Usuário'
  const userId = session?.user?.id || ''

  // Verifica se o usuário atual é o administrador do sistema
  const isAdmin = username === 'leandro.pf.am'

  const socketData = useSocket(currentRoom, username, userId) || {}
  const {
    messages = [],
    onlineUsers = [],
    typingUsers = [],
    sendMessage = () => {},
    sendTyping = () => {},
    handleEdit = () => {},
    handleDelete = () => {}
  } = socketData

  if (!session) return <LoginScreen />

  return (
  <div style={{ backgroundColor: '#0f172a', height: '100dvh', width: '100vw', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
    <div 
      className="chat-app" 
      style={{ 
        width: '100%', 
        maxWidth: '1200px', 
        height: '100dvh', 
        backgroundColor: '#1e293b', 
        display: 'flex', 
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden'
      }}
    >
      <ChatHeader
        currentRoom={currentRoom}
        users={onlineUsers}
        isConnected={true}
        onSwitchRoom={setCurrentRoom}
        onLogout={handleLogout}
      />
      
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        <MessageList
          messages={messages}
          currentUserId={userId}
          currentRoom={currentRoom}
          typingUsers={typingUsers}
          onReply={(msg) => setReplyTo(msg)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      <MessageInput
        currentRoom={currentRoom}
        isAdmin={isAdmin}
        onSendMessage={sendMessage}
        onTyping={sendTyping}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  </div>
)
}