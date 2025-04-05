import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useAuthStore from '@/features/stores/auth'
import { useMenuStore } from '@/features/stores/menu'
import { useHomeStore } from '@/features/stores/home'

export const Auth = () => {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userName, setUserName] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup' | 'profile'>('signin')
  const [savedName, setSavedName] = useState<string | null>(null)
  
  const { 
    user, 
    loading, 
    error, 
    signInWithGoogle, 
    signInWithEmail, 
    signUpWithEmail, 
    signOut,
    updateUserName,
    getUserName,
    clearError
  } = useAuthStore()

  const { setUserName: setHomeUserName } = useHomeStore()
  
  useEffect(() => {
    if (user) {
      setMode('profile')
      getUserName().then(name => {
        setSavedName(name)
        if (name) {
          setUserName(name)
          setHomeUserName(name)
        }
      })
    } else {
      setMode('signin')
    }
  }, [user, getUserName, setHomeUserName])

  useEffect(() => {
    return () => {
      clearError()
    }
  }, [clearError])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    await signInWithEmail(email, password)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    await signUpWithEmail(email, password)
  }

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateUserName(userName)
    setSavedName(userName)
    setHomeUserName(userName)
  }

  if (!user) {
    return (
      <div className="p-4">
        <div className="mb-4">
          <div className="flex space-x-4 mb-4">
            <button
              className={`px-4 py-2 rounded ${mode === 'signin' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              onClick={() => setMode('signin')}
            >
              {t('サインイン')}
            </button>
            <button
              className={`px-4 py-2 rounded ${mode === 'signup' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              onClick={() => setMode('signup')}
            >
              {t('サインアップ')}
            </button>
          </div>

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block mb-1">{t('メールアドレス')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block mb-1">{t('パスワード')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-blue-500 text-white rounded"
                disabled={loading}
              >
                {loading ? t('処理中...') : t('サインイン')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block mb-1">{t('メールアドレス')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block mb-1">{t('パスワード')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-blue-500 text-white rounded"
                disabled={loading}
              >
                {loading ? t('処理中...') : t('サインアップ')}
              </button>
            </form>
          )}

          {error && (
            <div className="mt-4 p-2 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {t('または')}
                </span>
              </div>
            </div>

            <button
              onClick={signInWithGoogle}
              className="mt-4 w-full py-2 border border-gray-300 rounded flex items-center justify-center space-x-2"
              disabled={loading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
                <path fill="none" d="M1 1h22v22H1z" />
              </svg>
              <span>{t('Googleでサインイン')}</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <div className="bg-gray-100 p-4 rounded mb-4">
          <p className="font-medium">{t('サインイン済み')}</p>
          <p className="text-sm text-gray-600">{user.email}</p>
        </div>

        <form onSubmit={handleUpdateName} className="space-y-4 mb-6">
          <div>
            <label className="block mb-1">{t('ユーザー名')}</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder={t('ユーザー名を入力')}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-blue-500 text-white rounded"
            disabled={loading || userName === savedName}
          >
            {loading ? t('更新中...') : t('ユーザー名を更新')}
          </button>
        </form>

        <button
          onClick={signOut}
          className="w-full py-2 border border-gray-300 rounded"
          disabled={loading}
        >
          {loading ? t('処理中...') : t('サインアウト')}
        </button>
      </div>
    </div>
  )
}

export default Auth
