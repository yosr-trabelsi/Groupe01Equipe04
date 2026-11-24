
import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth'

import { auth } from '../services/firebase'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const { data } = await api.get('/auth/me')
          setUser(data)
        } catch {
          setUser(null)
        }
      } else {
        setUser(null)
      }

      setLoading(false)
    })
  }, [])

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password)


  const getIdToken = async () => {
    const currentUser = auth.currentUser

    if (!currentUser) {
      throw new Error('Aucun utilisateur connecté')
    }

    return await currentUser.getIdToken()
  }

  const updateUser = (patch) =>
    setUser((u) => ({ ...u, ...patch }))

  const logout = async () => {
    setUser(null)

    try {
      await signOut(auth)
    } catch {

    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateUser,
        getIdToken
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
