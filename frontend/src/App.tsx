import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import { setUser, setLoading } from './store/authSlice'
import { type RootState } from './store/store'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Room from './pages/Room'

function App() {
  const dispatch = useDispatch()
  const { user, isLoading } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        dispatch(setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        }))
      } else {
        dispatch(setUser(null))
      }
    })

    return () => unsubscribe()
  }, [dispatch])

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/room/:id" element={user ? <Room /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
