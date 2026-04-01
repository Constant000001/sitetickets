'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Ticket, CheckCircle, AlertCircle, 
  Shield, Clock, MapPin, Calendar,
  Zap, Lock, Mic, FileText, Phone, PartyPopper
} from 'lucide-react'

interface TicketData {
  id: string
  ticketCode: string
  shortCode: string
  name: string
  email: string
  phone: string | null
  ticketType: string
  price: number
  createdAt: string
}

const TICKET_PRICE = 2000

export default function HomePage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [ticket, setTicket] = useState<TicketData | null>(null)
  const [error, setError] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [nameError, setNameError] = useState('')
  const [emailError, setEmailError] = useState('')

  const validateName = (value: string) => {
    if (!value.trim()) {
      setNameError('Le nom est requis')
      return false
    }
    if (value.trim().length < 2) {
      setNameError('Le nom doit contenir au moins 2 caractères')
      return false
    }
    setNameError('')
    return true
  }

  const validateEmail = (value: string) => {
    if (!value.trim()) {
      setEmailError('L\'email est requis')
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      setEmailError('Format email invalide')
      return false
    }
    setEmailError('')
    return true
  }

  const handleBuyTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const isNameValid = validateName(name)
    const isEmailValid = validateEmail(email)
    
    if (!isNameValid || !isEmailValid) return
    
    setIsLoading(true)
    setError('')
    setTicket(null)

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, ticketType: 'STANDARD' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création du ticket')
      }

      setTicket(data.ticket)
      setName('')
      setEmail('')
      setPhone('')
      setNameError('')
      setEmailError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  const downloadPDF = async () => {
    if (!ticket) return
    setIsDownloading(true)

    try {
      const response = await fetch('/api/tickets/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketCode: ticket.ticketCode }),
      })

      if (!response.ok) throw new Error('Erreur PDF')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ticket-rap-universe-${ticket.shortCode}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert('Erreur lors du téléchargement du PDF')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Simple gradient background - no animations */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-black to-red-900/20 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-purple-500/20 bg-black/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-4">
            <img src="/logo-rap-universe.jpeg" alt="Rap Universe" className="w-14 h-14 rounded-full object-cover border-2 border-purple-400" />
            <div>
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-red-400">RAP UNIVERSE</h1>
              <p className="text-xs text-zinc-500 flex items-center gap-2">
                <Mic className="w-3 h-3" />
                1ÈRE ÉDITION • WHERE LEGENDS AND RHYMES RISE
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              <span className="text-purple-400">ACHETEZ</span> VOTRE TICKET
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto mb-6">
              Prépare-toi pour la <span className="text-purple-400 font-bold">1ère édition</span> de RAP UNIVERSE ! 
              Concours de rap : LYRIC, CLASH et INTERPRETATION. 🚀
            </p>
            
            {/* Price Card */}
            <div className="inline-block bg-gradient-to-r from-purple-500/20 to-red-500/20 border border-purple-500/30 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/20 rounded-full">
                  <Ticket className="w-8 h-8 text-purple-400" />
                </div>
                <div className="text-left">
                  <p className="text-3xl font-bold text-white">{TICKET_PRICE.toLocaleString('fr-FR')} <span className="text-lg text-zinc-400">FCFA</span></p>
                  <p className="text-purple-400 flex items-center gap-2">
                    <PartyPopper className="w-4 h-4" />
                    1 cocktail offert 🍹
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-6 mt-6 text-sm text-zinc-500">
              <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-purple-400" />Samedi 11 Avril 2026</span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-purple-400" />15H00</span>
              <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-purple-400" />La'Madre - Calavi</span>
            </div>
            
            <div className="mt-4 flex items-center justify-center gap-4 text-sm">
              <a href="tel:0161168081" className="flex items-center gap-2 text-zinc-400 hover:text-purple-400">
                <Phone className="w-4 h-4" />0161168081
              </a>
              <span className="text-zinc-600">/</span>
              <a href="tel:0153045098" className="flex items-center gap-2 text-zinc-400 hover:text-purple-400">
                <Phone className="w-4 h-4" />0153045098
              </a>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Form */}
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-400" />
                  VOS INFORMATIONS
                </CardTitle>
                <CardDescription className="text-zinc-500">
                  Ces informations seront liées à votre ticket de manière sécurisée
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBuyTicket} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-zinc-300">Nom complet *</Label>
                    <Input 
                      id="name" 
                      value={name} 
                      onChange={(e) => { setName(e.target.value); if (e.target.value) validateName(e.target.value); }} 
                      placeholder="Votre nom complet" 
                      className={`bg-zinc-800 border-zinc-700 text-white ${nameError ? 'border-red-500' : ''}`} 
                    />
                    {nameError && <p className="text-red-400 text-xs">{nameError}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-zinc-300">Email *</Label>
                    <Input 
                      id="email" 
                      type="text"
                      value={email} 
                      onChange={(e) => { setEmail(e.target.value); if (e.target.value) validateEmail(e.target.value); }} 
                      placeholder="votre@email.com" 
                      className={`bg-zinc-800 border-zinc-700 text-white ${emailError ? 'border-red-500' : ''}`} 
                    />
                    {emailError && <p className="text-red-400 text-xs">{emailError}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-zinc-300">Téléphone (optionnel)</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+221 77 123 45 67" className="bg-zinc-800 border-zinc-700 text-white" />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 p-3 rounded-lg">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}

                  <div className="pt-4 border-t border-zinc-800">
                    <div className="flex items-center justify-between mb-4 text-sm">
                      <span className="text-zinc-400">Total à payer:</span>
                      <span className="text-2xl font-bold text-purple-400">{TICKET_PRICE.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-purple-500 to-red-500 text-white font-bold py-6 text-lg">
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          GÉNÉRATION...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2"><Zap className="w-5 h-5" />GÉNÉRER MON TICKET</span>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Right: Ticket Preview */}
            <div className="space-y-6">
              {ticket ? (
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-800 border-purple-500/50 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 via-red-500 to-pink-500 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src="/logo-rap-universe.jpeg" alt="Rap Universe" className="w-12 h-12 rounded-full object-cover border-2 border-white" />
                        <div>
                          <h3 className="text-xl font-bold text-white">RAP UNIVERSE</h3>
                          <p className="text-white/70 text-sm">1ÈRE ÉDITION • 2026</p>
                        </div>
                      </div>
                      <Badge className="bg-white text-purple-600 font-bold">
                        <PartyPopper className="w-3 h-3 mr-1" /> + COCKTAIL
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-6">
                      <div className="flex-shrink-0 bg-white p-4 rounded-xl mx-auto sm:mx-0">
                        <QRCodeSVG 
                          value={typeof window !== 'undefined' ? `${window.location.origin}/scan?q=${ticket.ticketCode}` : ticket.ticketCode} 
                          size={160} 
                          level="H" 
                        />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div><p className="text-zinc-500 text-xs">NOM</p><p className="text-white font-semibold">{ticket.name}</p></div>
                        <div><p className="text-zinc-500 text-xs">EMAIL</p><p className="text-white">{ticket.email}</p></div>
                        <div className="grid grid-cols-2 gap-4">
                          <div><p className="text-zinc-500 text-xs">TYPE</p><p className="font-semibold text-purple-400">TICKET</p></div>
                          <div><p className="text-zinc-500 text-xs">PRIX</p><p className="text-purple-400 font-semibold">{ticket.price.toLocaleString('fr-FR')} FCFA</p></div>
                        </div>
                        <div className="pt-2 border-t border-zinc-700"><p className="text-zinc-500 text-xs">CODE</p><p className="text-purple-300 font-mono">{ticket.shortCode}</p></div>
                      </div>
                    </div>
                    <Separator className="my-4 bg-zinc-700" />
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div><Calendar className="w-5 h-5 text-purple-400 mx-auto mb-1" /><p className="text-zinc-500 text-xs">DATE</p><p className="text-white font-medium">11 Avril</p></div>
                      <div><Clock className="w-5 h-5 text-purple-400 mx-auto mb-1" /><p className="text-zinc-500 text-xs">HEURE</p><p className="text-white font-medium">15H00</p></div>
                      <div><MapPin className="w-5 h-5 text-purple-400 mx-auto mb-1" /><p className="text-zinc-500 text-xs">LIEU</p><p className="text-white font-medium">La'Madre</p></div>
                    </div>
                    
                    <Button 
                      onClick={downloadPDF} 
                      disabled={isDownloading}
                      className="w-full mt-4 bg-gradient-to-r from-purple-500 to-red-500 text-white font-bold"
                    >
                      {isDownloading ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          GÉNÉRATION PDF...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          TÉLÉCHARGER EN PDF
                        </span>
                      )}
                    </Button>
                  </CardContent>
                  <div className="bg-green-500/10 border-t border-green-500/30 p-4 text-center">
                    <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
                    <p className="text-green-400 font-semibold">TICKET GÉNÉRÉ !</p>
                    <p className="text-zinc-400 text-sm">Téléchargez votre ticket PDF</p>
                  </div>
                </Card>
              ) : (
                <Card className="bg-zinc-900/50 border-zinc-800 border-dashed">
                  <CardContent className="py-16 text-center">
                    <Ticket className="w-20 h-20 text-zinc-700 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-zinc-500 mb-2">Votre ticket apparaîtra ici</h3>
                    <p className="text-zinc-600 text-sm">Remplissez le formulaire pour générer votre ticket</p>
                  </CardContent>
                </Card>
              )}

              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-purple-400 mt-0.5" />
                    <div>
                      <h4 className="text-purple-400 font-semibold mb-1">SÉCURITÉ GARANTIE</h4>
                      <ul className="text-zinc-500 text-sm space-y-1">
                        <li>• QR code unique et crypté</li>
                        <li>• Code de vérification court</li>
                        <li>• Anti-fraude intégré</li>
                        <li>• PDF téléchargeable avec QR code</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-800 bg-black/50 mt-12 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-zinc-600 text-sm">© 2026 RAP UNIVERSE • 1ère Édition</p>
          <p className="text-zinc-500 text-xs mt-1">La'Madre • En face de Pigier Calavi</p>
          <div className="flex items-center justify-center gap-4 mt-3 text-sm">
            <a href="tel:0161168081" className="text-zinc-500 hover:text-purple-400">0161168081</a>
            <span className="text-zinc-700">|</span>
            <a href="tel:0153045098" className="text-zinc-500 hover:text-purple-400">0153045098</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
