import { useState, useEffect } from 'react'
import Head from 'next/head'
import LoginForm from '../components/LoginForm'
import Dashboard from '../components/Dashboard'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [credentials, setCredentials] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const savedCredentials = localStorage.getItem('poolCredentials')
    if (savedCredentials) {
      try {
        const parsed = JSON.parse(savedCredentials)
        setCredentials(parsed)
        setIsAuthenticated(true)
      } catch (error) {
        console.error('Failed to parse saved credentials:', error)
        localStorage.removeItem('poolCredentials')
      }
    }
    setLoading(false)
  }, [])

  const handleLogin = (creds) => {
    setCredentials(creds)
    setIsAuthenticated(true)
    localStorage.setItem('poolCredentials', JSON.stringify(creds))
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setCredentials(null)
    localStorage.removeItem('poolCredentials')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-pool-500"></div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Hayward Omni Pool Manager</title>
        <meta name="description" content="Manage your Hayward Omni pool automation system" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen">
        {isAuthenticated ? (
          <Dashboard credentials={credentials} onLogout={handleLogout} />
        ) : (
          <LoginForm onLogin={handleLogin} />
        )}
      </div>
    </>
  )
}