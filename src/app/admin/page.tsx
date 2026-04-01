'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Shield, ArrowLeft, AlertCircle, CheckCircle, XCircle, Ticket,
  TrendingUp, LogOut, Eye, EyeOff, Activity, Database, RefreshCw,
  Camera, CameraOff, Search, Users, List
} from 'lucide-react'

interface AdminUser { id: string; username: string; role: string }

interface TicketInfo {
  shortCode: string
  name: string
  email: string
  phone?: string | null
  ticketType: string
  price: number
  usedAt?: string
}

interface ScanResult {
  success: boolean
  status: string
  message: string
  subMessage?: string
  ticket?: TicketInfo
}

interface Stats { total: number; used: number; revenue: number }

interface TicketRow {
  id: string
  shortCode: string
  name: string
  email: string
  phone?: string | null
  ticketType: string
  price: number
  isUsed: boolean
  usedAt?: string
  createdAt: string
}

// ── Composant scanner QR caméra ────────────────────────────────────
function QRCameraScanner({ onScan, isActive }: { onScan: (code: string) => void; isActive: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scannerRef = useRef<unknown>(null)

  useEffect(() => {
    if (!isActive) {
      stopScanner()
      return
    }
    startScanner()
    return () => { stopScanner() }
  }, [isActive])

  const startScanner = async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode('qr-reader', { verbose: false })
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          // Extraire le ticketCode des QR codes du projet (format: /scan?q=<uuid>)
          let code = decodedText
          try {
            const url = new URL(decodedText)
            const q = url.searchParams.get('q')
            if (q) code = q
          } catch {
            // Ce n'est pas une URL, on utilise le texte brut
          }
          onScan(code)
        },
        () => { /* ignore les frames sans QR */ }
      )
    } catch (err) {
      console.error('Erreur démarrage scanner:', err)
    }
  }

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        const s = scannerRef.current as { stop: () => Promise<void>; clear: () => void }
        await s.stop()
        s.clear()
        scannerRef.current = null
      }
    } catch {
      // ignore
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  return (
    <div id="qr-reader" className={`w-full rounded-xl overflow-hidden ${isActive ? 'border border-purple-500/40' : 'hidden'}`} />
  )
}

// ── Page Admin principale ──────────────────────────────────────────
function AdminContent() {
  const router = useRouter()
  const searchParams = useSearchParams ? useSearchParams() : null

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // Validation manuelle
  const [scanCode, setScanCode] = useState('')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  // Scanner caméra
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraScanning, setCameraScanning] = useState(false)

  // Stats & liste
  const [stats, setStats] = useState<Stats | null>(null)
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [activeTab, setActiveTab] = useState<'scan' | 'list'>('scan')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => { checkAuth() }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/verify', { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setAdmin(data.admin)
        setIsAuthenticated(true)
        fetchData()

        // Redirect après login si param présent
        const redirect = searchParams?.get('redirect')
        if (redirect) router.push(redirect)
      }
    } catch { /* non connecté */ }
    setIsLoading(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoggingIn(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Identifiants invalides')
      setAdmin(data.admin)
      setIsAuthenticated(true)
      fetchData()
      // Redirect si présent
      const redirect = searchParams?.get('redirect')
      if (redirect) router.push(redirect)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    setCameraActive(false)
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    setIsAuthenticated(false)
    setAdmin(null)
    setStats(null)
    setTickets([])
  }

  const fetchData = async () => {
    try {
      const res = await fetch('/api/tickets', { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setStats(data.stats)
        setTickets(data.tickets ?? [])
      }
    } catch { /* ignore */ }
  }

  const validateTicket = async (code: string) => {
    if (!code.trim()) return
    setIsValidating(true)
    setScanResult(null)
    setCameraScanning(false)
    try {
      const res = await fetch('/api/tickets/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ticketCode: code.trim() })
      })
      const data = await res.json()
      setScanResult(data)
      fetchData()
    } catch {
      setScanResult({ success: false, status: 'ERROR', message: 'Erreur réseau' })
    } finally {
      setIsValidating(false)
    }
  }

  const handleManualScan = async (e: React.FormEvent) => {
    e.preventDefault()
    await validateTicket(scanCode.trim())
    setScanCode('')
  }

  const handleCameraScan = async (code: string) => {
    if (cameraScanning) return
    setCameraScanning(true)
    setCameraActive(false) // éteindre la caméra après scan
    await validateTicket(code)
  }

  const filteredTickets = tickets.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.shortCode.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ── Loading ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-500 text-sm">Chargement...</p>
        </div>
      </div>
    )
  }

  // ── Formulaire de connexion ────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-red-900/20" />
        <Card className="relative z-10 w-full max-w-md bg-zinc-900/90 border-purple-500/30">
          <CardHeader className="text-center">
            <Button variant="ghost" onClick={() => router.push('/')} className="absolute top-4 left-4 text-zinc-500 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center border-2 border-purple-500/50">
              <Shield className="w-8 h-8 text-purple-400" />
            </div>
            <CardTitle className="text-2xl text-white">ACCÈS ADMIN</CardTitle>
            <CardDescription className="text-zinc-400">Zone administrateur sécurisée</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label className="text-zinc-300">Identifiant</Label>
                <Input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="bg-zinc-800 border-zinc-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Mot de passe</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="bg-zinc-800 border-zinc-700 text-white mt-1 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                </div>
              )}
              <Button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-gradient-to-r from-purple-500 to-red-500 text-white font-bold py-3"
              >
                {isLoggingIn ? 'CONNEXION...' : 'SE CONNECTER'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Dashboard connecté ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-br from-purple-900/10 via-black to-red-900/10" />

      {/* Header */}
      <header className="relative z-10 border-b border-purple-500/20 bg-black/80">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => router.push('/')} className="text-zinc-400 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />Accueil
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
              <div className="text-right hidden sm:block">
                <p className="text-white font-medium text-sm">{admin?.username}</p>
                <Badge className="bg-purple-500 text-white text-xs">{admin?.role}</Badge>
              </div>
              <Button variant="outline" onClick={handleLogout} className="border-purple-500/30 text-purple-400">
                <LogOut className="w-4 h-4 mr-2" />Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-white">{stats?.total ?? '—'}</p>
              <p className="text-zinc-500 text-xs mt-1">Tickets vendus</p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-400">{stats?.used ?? '—'}</p>
              <p className="text-green-400/70 text-xs mt-1">Validés</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/5 border-purple-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-xl font-bold text-purple-400">{stats ? `${stats.revenue.toLocaleString('fr-FR')}` : '—'}</p>
              <p className="text-purple-400/70 text-xs mt-1">FCFA revenus</p>
            </CardContent>
          </Card>
        </div>

        {/* Onglets */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'scan' ? 'default' : 'outline'}
            onClick={() => setActiveTab('scan')}
            className={activeTab === 'scan'
              ? 'bg-gradient-to-r from-purple-500 to-red-500 text-white font-bold'
              : 'border-zinc-700 text-zinc-400 hover:text-white'}
          >
            <Activity className="w-4 h-4 mr-2" />Scanner
          </Button>
          <Button
            variant={activeTab === 'list' ? 'default' : 'outline'}
            onClick={() => { setActiveTab('list'); fetchData() }}
            className={activeTab === 'list'
              ? 'bg-gradient-to-r from-purple-500 to-red-500 text-white font-bold'
              : 'border-zinc-700 text-zinc-400 hover:text-white'}
          >
            <List className="w-4 h-4 mr-2" />Tickets ({stats?.total ?? 0})
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchData}
            className="text-zinc-400 hover:text-white ml-auto"
            title="Rafraîchir"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* ── Onglet SCAN ─────────────────────────────────────── */}
        {activeTab === 'scan' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Panneau validation */}
            <Card className="bg-zinc-900/80 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-400" />VALIDER UN TICKET
                </CardTitle>
                <CardDescription className="text-zinc-500">
                  Scannez le QR code ou entrez le code manuellement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Bouton scanner caméra */}
                <Button
                  onClick={() => { setCameraActive(!cameraActive); setScanResult(null) }}
                  className={`w-full font-bold ${cameraActive
                    ? 'bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30'
                    : 'bg-purple-500/20 border border-purple-500/50 text-purple-400 hover:bg-purple-500/30'}`}
                  variant="outline"
                >
                  {cameraActive
                    ? <><CameraOff className="w-4 h-4 mr-2" />ARRÊTER LA CAMÉRA</>
                    : <><Camera className="w-4 h-4 mr-2" />SCANNER QR AVEC LA CAMÉRA</>}
                </Button>

                {/* Scanner caméra */}
                {cameraActive && (
                  <div className="rounded-xl overflow-hidden border border-purple-500/30">
                    <QRCameraScanner onScan={handleCameraScan} isActive={cameraActive} />
                    <p className="text-zinc-500 text-xs text-center py-2">
                      Pointez la caméra vers le QR code du ticket
                    </p>
                  </div>
                )}

                <Separator className="bg-zinc-800" />

                {/* Saisie manuelle */}
                <form onSubmit={handleManualScan} className="space-y-3">
                  <Label className="text-zinc-400 text-xs uppercase tracking-wider">Ou entrez le code manuellement</Label>
                  <div className="flex gap-3">
                    <Input
                      value={scanCode}
                      onChange={e => setScanCode(e.target.value.toUpperCase())}
                      placeholder="RU-2026-XXXXXX ou UUID complet"
                      className="bg-zinc-800 border-zinc-700 text-white font-mono flex-1"
                    />
                    <Button
                      type="submit"
                      disabled={isValidating || !scanCode.trim()}
                      className="bg-gradient-to-r from-purple-500 to-red-500 text-white font-bold px-6"
                    >
                      {isValidating ? '...' : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                </form>

                {/* Résultat du scan */}
                {scanResult && (
                  <div className={`p-5 rounded-xl ${
                    scanResult.status === 'VALID'
                      ? 'bg-green-500/10 border border-green-500/30'
                      : scanResult.status === 'ALREADY_USED'
                      ? 'bg-orange-500/10 border border-orange-500/30'
                      : 'bg-red-500/10 border border-red-500/30'
                  }`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-full ${
                        scanResult.status === 'VALID' ? 'bg-green-500/20'
                        : scanResult.status === 'ALREADY_USED' ? 'bg-orange-500/20'
                        : 'bg-red-500/20'
                      }`}>
                        {scanResult.status === 'VALID'
                          ? <CheckCircle className="w-6 h-6 text-green-400" />
                          : scanResult.status === 'ALREADY_USED'
                          ? <AlertCircle className="w-6 h-6 text-orange-400" />
                          : <XCircle className="w-6 h-6 text-red-400" />}
                      </div>
                      <div>
                        <p className={`text-lg font-bold ${
                          scanResult.status === 'VALID' ? 'text-green-400'
                          : scanResult.status === 'ALREADY_USED' ? 'text-orange-400'
                          : 'text-red-400'
                        }`}>{scanResult.message}</p>
                        {scanResult.subMessage && (
                          <p className="text-zinc-400 text-sm">{scanResult.subMessage}</p>
                        )}
                      </div>
                    </div>

                    {scanResult.ticket && (
                      <div className="grid grid-cols-2 gap-2 text-sm pt-3 border-t border-zinc-700/50">
                        <div className="bg-zinc-800/50 p-2 rounded">
                          <span className="text-zinc-500 text-xs">Nom</span>
                          <p className="text-white font-medium">{scanResult.ticket.name}</p>
                        </div>
                        <div className="bg-zinc-800/50 p-2 rounded">
                          <span className="text-zinc-500 text-xs">Prix</span>
                          <p className="text-purple-400 font-bold">{scanResult.ticket.price?.toLocaleString('fr-FR')} FCFA</p>
                        </div>
                        <div className="bg-zinc-800/50 p-2 rounded col-span-2">
                          <span className="text-zinc-500 text-xs">Code</span>
                          <p className="text-white font-mono">{scanResult.ticket.shortCode}</p>
                        </div>
                        {scanResult.ticket.usedAt && (
                          <div className="bg-orange-500/10 p-2 rounded col-span-2">
                            <span className="text-zinc-500 text-xs">Première utilisation</span>
                            <p className="text-orange-400 text-sm">{new Date(scanResult.ticket.usedAt).toLocaleString('fr-FR')}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Infos événement */}
            <div className="space-y-4">
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />Barre de progression
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Tickets validés</span>
                      <span className="text-white">{stats?.used ?? 0} / {stats?.total ?? 0}</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-red-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: stats?.total ? `${(stats.used / stats.total) * 100}%` : '0%' }}
                      />
                    </div>
                    <p className="text-zinc-500 text-xs text-right">
                      {stats?.total ? `${Math.round((stats.used / stats.total) * 100)}% de l'audience présente` : 'Aucun ticket'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-4">
                  <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-400" />Instructions scan
                  </h3>
                  <ul className="text-zinc-400 text-sm space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">①</span>
                      <span>Cliquez sur <strong className="text-white">SCANNER QR</strong> pour activer la caméra</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">②</span>
                      <span>Pointez vers le QR code du ticket du participant</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">③</span>
                      <span>Le résultat s'affiche automatiquement</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✅</span>
                      <span>Vert = entrée autorisée</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-400 mt-0.5">⚠️</span>
                      <span>Orange = ticket déjà utilisé (refuser)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">❌</span>
                      <span>Rouge = ticket inexistant (refuser)</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── Onglet LISTE ────────────────────────────────────── */}
        {activeTab === 'list' && (
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />Liste des participants
                </CardTitle>
                <Badge className="bg-zinc-800 text-zinc-300">{filteredTickets.length} résultats</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Barre de recherche */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par nom, email ou code..."
                  className="bg-zinc-800 border-zinc-700 text-white pl-9"
                />
              </div>

              {/* Liste */}
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {filteredTickets.length === 0 ? (
                  <div className="text-center py-12">
                    <Database className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500">Aucun ticket trouvé</p>
                  </div>
                ) : (
                  filteredTickets.map(ticket => (
                    <div
                      key={ticket.id}
                      className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
                        ticket.isUsed
                          ? 'bg-green-500/5 border-green-500/20'
                          : 'bg-zinc-800/50 border-zinc-700/50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium text-sm truncate">{ticket.name}</span>
                          <Badge
                            className={`text-xs shrink-0 ${ticket.isUsed
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-zinc-700 text-zinc-400'}`}
                          >
                            {ticket.isUsed ? '✓ Validé' : 'En attente'}
                          </Badge>
                        </div>
                        <p className="text-zinc-500 text-xs truncate">{ticket.email}</p>
                        <p className="text-purple-400 text-xs font-mono mt-1">{ticket.shortCode}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white text-sm font-bold">{ticket.price.toLocaleString('fr-FR')} F</p>
                        <p className="text-zinc-600 text-xs">{new Date(ticket.createdAt).toLocaleDateString('fr-FR')}</p>
                        {ticket.isUsed && ticket.usedAt && (
                          <p className="text-green-500 text-xs">{new Date(ticket.usedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

// ── Export avec Suspense (requis pour useSearchParams) ────────────────
export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AdminContent />
    </Suspense>
  )
}
