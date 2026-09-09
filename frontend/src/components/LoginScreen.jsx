import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    try {
      if (isLogin) {
        // Login simples
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        if (error) throw error
      } else {
        // Cadastro: envia display_name no metadata e cria o perfil na tabela public.profiles
        if (!username.trim()) {
          throw new Error('Por favor, informe um nome de usuário.')
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: username.trim()
            }
          }
        })

        if (error) throw error

        // Se o usuário foi criado, salvamos o nome na tabela profiles
        if (data?.user) {
          const { error: profileError } = await supabase.from('profiles').upsert([
            {
              id: data.user.id,
              username: username.trim()
            }
          ])
          if (profileError) console.error('Erro ao salvar no perfil:', profileError)
        }
      }
    } catch (error) {
      setErrorMessage(error.message || 'Ocorreu um erro ao autenticar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container" style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#111827',
      color: '#fff'
    }}>
      <form onSubmit={handleAuth} style={{
        backgroundColor: '#1f2937',
        padding: '30px',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '380px',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
      }}>
        <h2 style={{ textAlign: 'center', margin: '0 0 10px' }}>
          {isLogin ? 'Entrar no Resenha' : 'Criar Conta'}
        </h2>

        {errorMessage && (
          <div style={{ color: '#f87171', fontSize: '0.9rem', textAlign: 'center' }}>
            {errorMessage}
          </div>
        )}

        {!isLogin && (
          <div>
            <label style={{ fontSize: '0.85rem', marginBottom: '5px', display: 'block' }}>
              Nome de Usuário
            </label>
            <input
              type="text"
              placeholder="Seu apelido no chat"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #374151',
                backgroundColor: '#111827',
                color: '#fff'
              }}
            />
          </div>
        )}

        <div>
          <label style={{ fontSize: '0.85rem', marginBottom: '5px', display: 'block' }}>E-mail</label>
          <input
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #374151',
              backgroundColor: '#111827',
              color: '#fff'
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.85rem', marginBottom: '5px', display: 'block' }}>Senha</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #374151',
              backgroundColor: '#111827',
              color: '#fff'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: '#6366f1',
            color: '#fff',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          {loading ? 'Carregando...' : isLogin ? 'Entrar' : 'Cadastrar'}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsLogin(!isLogin)
            setErrorMessage('')
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            fontSize: '0.85rem',
            marginTop: '5px'
          }}
        >
          {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'}
        </button>
      </form>
    </div>
  )
}