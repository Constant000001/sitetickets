'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Shield, ArrowLeft, AlertCircle, CheckCircle, XCircle,
  Ticket, TrendingUp, LogOut, Eye, EyeOff,
  Activity, Database, Settings, RefreshCw, Volume2, VolumeX
} from 'lucide-react'

interface AdminUser {
  id: string
  username: string
  role: string
}

interface TicketInfo {
  shortCode: string
  name: string
  email: string
  ticketType: string
  price: number
  usedAt?: string
}

interface Stats {
  total: number
  used: number
  standard: number
  vip: number
  premium: number
  revenue: number
}

export default function AdminPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Login form
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  
  // Validation
  const [scanCode, setScanCode] = useState('')
  const [scanResult, setScanResult] = useState<{
    success: boolean
    status: string
    message: string
    subMessage?: string
    ticket?: TicketInfo
  } | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  
  // Stats
  const [stats, setStats] = useState<Stats | null>(null)
  
  // Sound
  const [soundEnabled, setSoundEnabled] = useState(true)
  
  // Setup
  const [needsSetup, setNeedsSetup] = useState(false)
  const [setupUsername, setSetupUsername] = useState('')
  const [setupPassword, setSetupPassword] = useState('')
  const [setupSecretKey, setSetupSecretKey] = useState('')

  useEffect(() => {
    checkAuth()
  }, [])

  const playSound = (type: 'success' | 'warning' | 'error') => {
    if (!soundEnabled || typeof window === 'undefined') return
    
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      if (type === 'success') {
        oscillator.frequency.value = 800
        oscillator.type = 'sine'
        gainNode.gain.value = 0.3
        oscillator.start()
        setTimeout(() => {
          oscillator.frequency.value = 1000
          setTimeout(() => oscillator.stop(), 100)
        }, 100)
      } else if (type === 'warning') {
        oscillator.frequency.value = 400
        oscillator.type = 'square'
        gainNode.gain.value = 0.2
        oscillator.start()
        setTimeout(() => oscillator.stop(), 300)
      } else {
        oscillator.frequency.value = 200
        oscillator.type = 'sawtooth'
        gainNode.gain.value = 0.2
        oscillator.start()
        setTimeout(() => oscillator.stop(), 500)
      }
    } catch {
      // Audio not supported
    }
  }

  const checkAuth = async () => {
    setIsLoading(true)
    try {
      // Check if needs setup
      const setupRes = await fetch('/api/auth/setup')
      const setupData = await setupRes.json()
      if (setupData.needsSetup) {
        setNeedsSetup(true)
        setIsLoading(false)
        return
      }

      // Verify existing session (cookies are sent automatically)
      const res = await fetch('/api/auth/verify')
      const data = await res.json()
      
      if (data.success) {
        setAdmin(data.admin)
        setIsAuthenticated(true)
        fetchStats()
      }
    } catch {
      // Not authenticated
    }
    setIsLoading(false)
  }

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoggingIn(true)
    setError('')

    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: setupUsername,
          password: setupPassword,
          secretKey: setupSecretKey
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      setNeedsSetup(false)
      alert('Super Admin créé ! Connectez-vous maintenant.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoggingIn(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Identifiants invalides')
      
      setAdmin(data.admin)
      setIsAuthenticated(true)
      fetchStats()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setIsAuthenticated(false)
    setAdmin(null)
    setStats(null)
  }

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/tickets')
      const data = await res.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch {
      console.error('Error fetching stats')
    }
  }

  const validateTicket = async (code: string) => {
    if (!code.trim()) return
    
    setIsValidating(true)
    setScanResult(null)
    
    try {
      const res = await fetch('/api/tickets/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketCode: code })
      })
      const data = await res.json()
      
      setScanResult(data)
      
      if (data.status === 'VALID') {
        playSound('success')
      } else if (data.status === 'ALREADY_USED') {
        playSound('warning')
      } else {
        playSound('error')
      }
      
      fetchStats()
    } catch {
      setScanResult({
        success: false,
        status: 'ERROR',
        message: '❌ ERREUR RÉSEAU',
        subMessage: 'Impossible de contacter le serveur'
      })
      playSound('error')
    } finally {
      setIsValidating(false)
    }
  }

  const handleManualScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scanCode.trim()) return
    await validateTicket(scanCode.trim())
    setScanCode('')
  }

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  // Setup Screen
  if (needsSetup) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-red-900/20" />
        <Card className="relative z-10 w-full max-w-md bg-zinc-900/90 border-purple-500/50 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Settings className="w-8 h-8 text-purple-400" />
            </div>
            <CardTitle className="text-2xl text-white">INITIALISATION</CardTitle>
            <CardDescription className="text-zinc-400">Première configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetup} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">Nom d'utilisateur</Label>
                <Input value={setupUsername} onChange={(e) => setSetupUsername(e.target.value)} required className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Mot de passe</Label>
                <Input type="password" value={setupPassword} onChange={(e) => setSetupPassword(e.target.value)} required className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Clé secrète</Label>
                <Input type="password" value={setupSecretKey} onChange={(e) => setSetupSecretKey(e.target.value)} required className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              {error && <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
              <Button type="submit" disabled={isLoggingIn} className="w-full bg-gradient-to-r from-purple-500 to-red-500 text-white font-bold py-6">
                {isLoggingIn ? 'Création...' : 'CRÉER'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-red-900/20" />
        <Card className="relative z-10 w-full max-w-md bg-zinc-900/90 border-purple-500/30 backdrop-blur-sm">
          <CardHeader className="text-center">
            <Button variant="ghost" onClick={() => router.push('/')} className="absolute top-4 left-4 text-zinc-500 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center border-2 border-purple-500/50">
              <Shield className="w-8 h-8 text-purple-400" />
            </div>
            <CardTitle className="text-2xl text-white">ACCÈS SÉCURISÉ</CardTitle>
            <CardDescription className="text-zinc-400">Zone administrateur</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">Identifiant</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} required className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Mot de passe</Label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-zinc-800 border-zinc-700 text-white pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
              <Button type="submit" disabled={isLoggingIn} className="w-full bg-gradient-to-r from-purple-500 to-red-500 text-white font-bold py-6">
                {isLoggingIn ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />CONNEXION...</span> : 'SE CONNECTER'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-br from-purple-900/10 via-black to-red-900/10" />

      {/* Header */}
      <header className="relative z-10 border-b border-purple-500/20 bg-black/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => router.push('/')} className="text-zinc-400 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" /> Accueil
              </Button>
              <div className="flex items-center gap-3">
                <img src="/logo-rap-universe.jpeg" alt="Rap Universe" className="w-10 h-10 rounded-full border border-purple-500/50" />
                <div>
                  <h1 className="text-lg font-bold text-white">RAP UNIVERSE</h1>
                  <p className="text-xs text-zinc-500 font-mono">ADMIN</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => setSoundEnabled(!soundEnabled)} className={soundEnabled ? 'text-green-400' : 'text-zinc-500'}>
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </Button>
              <div className="text-right">
                <p className="text-white font-medium">{admin?.username}</p>
                <Badge className="bg-purple-500 text-white text-xs">{admin?.role}</Badge>
              </div>
              <Button variant="outline" onClick={handleLogout} className="border-purple-500/30 text-purple-400">
                <LogOut className="w-4 h-4 mr-2" /> Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Validation */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-zinc-900/80 border-purple-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  VALIDER UN TICKET
                </CardTitle>
                <CardDescription className="text-zinc-500">
                  Entrez le code du ticket (ex: RU-2026-XXXXXX)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleManualScan} className="space-y-4">
                  <div className="flex gap-3">
                    <Input
                      value={scanCode}
                      onChange={(e) => setScanCode(e.target.value.toUpperCase())}
                      placeholder="RU-2026-XXXXXX"
                      className="bg-zinc-800 border-zinc-700 text-white font-mono text-lg tracking-wider focus:border-purple-500 flex-1"
                      autoFocus
                    />
                    <Button 
                      type="submit" 
                      disabled={isValidating || !scanCode.trim()} 
                      className="bg-gradient-to-r from-purple-500 to-red-500 text-white font-bold px-8"
                    >
                      {isValidating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'VALIDER'}
                    </Button>
                  </div>
                </form>

                {/* Result */}
                {scanResult && (
                  <div className={`mt-6 p-6 rounded-xl ${
                    scanResult.status === 'VALID' ? 'bg-green-500/10 border border-green-500/30' :
                    scanResult.status === 'ALREADY_USED' ? 'bg-orange-500/10 border border-orange-500/30' :
                    'bg-red-500/10 border border-red-500/30'
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${
                        scanResult.status === 'VALID' ? 'bg-green-500/20' :
                        scanResult.status === 'ALREADY_USED' ? 'bg-orange-500/20' :
                        'bg-red-500/20'
                      }`}>
                        {scanResult.status === 'VALID' ? <CheckCircle className="w-8 h-8 text-green-400" /> :
                         scanResult.status === 'ALREADY_USED' ? <AlertCircle className="w-8 h-8 text-orange-400" /> :
                         <XCircle className="w-8 h-8 text-red-400" />}
                      </div>
                      <div className="flex-1">
                        <p className={`text-xl font-bold ${
                          scanResult.status === 'VALID' ? 'text-green-400' :
                          scanResult.status === 'ALREADY_USED' ? 'text-orange-400' :
                          'text-red-400'
                        }`}>
                          {scanResult.message}
                        </p>
                        {scanResult.subMessage && <p className="text-zinc-400 text-sm">{scanResult.subMessage}</p>}
                        {scanResult.ticket && (
                          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-zinc-800/50 p-2 rounded"><span className="text-zinc-500">Nom:</span> <span className="text-white ml-2 font-medium">{scanResult.ticket.name}</span></div>
                            <div className="bg-zinc-800/50 p-2 rounded"><span className="text-zinc-500">Prix:</span> <span className="text-purple-400 ml-2 font-bold">{scanResult.ticket.price?.toLocaleString('fr-FR')} FCFA</span></div>
                            <div className="bg-zinc-800/50 p-2 rounded col-span-2"><span className="text-zinc-500">Code:</span> <span className="text-white ml-2 font-mono">{scanResult.ticket.shortCode}</span></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Test */}
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-zinc-400" />
                  CODES DE TEST
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-500 text-sm mb-3">Cliquez pour tester la validation :</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="font-mono text-purple-400 border-purple-500/30" onClick={() => validateTicket('RU-2026-TEST01')}>
                    RU-2026-TEST01
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats */}
          <div className="space-y-6">
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    STATS
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={fetchStats} className="text-zinc-400">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-zinc-800/50 p-4 rounded-lg text-center">
                        <p className="text-3xl font-bold text-white">{stats.total}</p>
                        <p className="text-zinc-500 text-xs">Vendus</p>
                      </div>
                      <div className="bg-green-500/10 p-4 rounded-lg text-center border border-green-500/20">
                        <p className="text-3xl font-bold text-green-400">{stats.used}</p>
                        <p className="text-green-400/70 text-xs">Validés</p>
                      </div>
                    </div>
                    
                    <Separator className="bg-zinc-700" />

                    <div className="bg-gradient-to-r from-purple-500/10 to-red-500/10 p-4 rounded-lg border border-purple-500/20">
                      <p className="text-zinc-400 text-sm">Revenus</p>
                      <p className="text-2xl font-bold text-purple-400">{stats.revenue.toLocaleString('fr-FR')} FCFA</p>
                      <p className="text-zinc-500 text-xs mt-1">Prix: 2 000 FCFA / ticket</p>
                    </div>
                    
                    <div className="text-xs text-zinc-600 text-center">
                      <p>Contact: 0161168081 / 0153045098</p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-zinc-500">
                    <Database className="w-8 h-8 mx-auto mb-2" /> Chargement...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
