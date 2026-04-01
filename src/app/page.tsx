'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Ticket, CheckCircle, AlertCircle, Shield, Clock, MapPin, Calendar, Zap, Lock, Mic, FileText, Phone, PartyPopper } from 'lucide-react'

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

  const handleBuyTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim() || !email.trim()) {
      setError('Le nom et l\'email sont requis')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Format email invalide')
      return
    }
    
    setIsLoading(true)
    setError('')
    setTicket(null)

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() || null, ticketType: 'STANDARD' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création du ticket')
      }

      setTicket(data.ticket)
      setName('')
      setEmail('')
      setPhone('')
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

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Erreur PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ticket-rap-universe-${ticket.shortCode}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors du téléchargement')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-black to-red-900/20 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-purple-500/20 bg-black/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-4">
            <img src="/logo-rap-universe.jpeg" alt="Rap Universe" className="w-14 h-14 rounded-full object-cover border-2 border-purple-400" />
            <div>
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-red-400">RAP UNIVERSE</h1>
              <p className="text-xs text-zinc-500 flex items-center gap-2">
                <Mic className="w-3 h-3" />1ÈRE ÉDITION
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="text-purple-400">ACHETEZ</span> VOTRE TICKET
            </h2>
            <p className="text-zinc-400 mb-6">
              Prépare-toi pour la 1ère édition de RAP UNIVERSE ! Concours de rap : LYRIC, CLASH et INTERPRETATION.
            </p>
            
            {/* Price */}
            <div className="inline-block bg-gradient-to-r from-purple-500/20 to-red-500/20 border border-purple-500/30 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/20 rounded-full">
                  <Ticket className="w-8 h-8 text-purple-400" />
                </div>
                <div className="text-left">
                  <p className="text-3xl font-bold">{TICKET_PRICE.toLocaleString('fr-FR')} <span className="text-lg text-zinc-400">FCFA</span></p>
                  <p className="text-purple-400">1 cocktail offert</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-zinc-500">
              <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-purple-400" />11 Avril 2026</span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-purple-400" />15H00</span>
              <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-purple-400" />La'Madre - Calavi</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Form */}
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-400" />VOS INFORMATIONS
                </CardTitle>
                <CardDescription className="text-zinc-500">Remplissez le formulaire pour obtenir votre ticket</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBuyTicket} className="space-y-4">
                  <div>
                    <Label className="text-zinc-300">Nom complet *</Label>
                    <Input 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="Votre nom" 
                      className="bg-zinc-800 border-zinc-700 text-white mt-1" 
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-300">Email *</Label>
                    <Input 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="votre@email.com" 
                      className="bg-zinc-800 border-zinc-700 text-white mt-1" 
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-300">Téléphone (optionnel)</Label>
                    <Input 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      placeholder="+221 77 123 45 67" 
                      className="bg-zinc-800 border-zinc-700 text-white mt-1" 
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 p-3 rounded-lg">
                      <AlertCircle className="w-4 h-4" />{error}
                    </div>
                  )}

                  <div className="pt-4 border-t border-zinc-800">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-zinc-400">Total:</span>
                      <span className="text-2xl font-bold text-purple-400">{TICKET_PRICE.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-purple-500 to-red-500 text-white font-bold py-3">
                      {isLoading ? 'GÉNÉRATION...' : 'GÉNÉRER MON TICKET'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Ticket Preview */}
            <div>
              {ticket ? (
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-800 border-purple-500/50 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 via-red-500 to-pink-500 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src="/logo-rap-universe.jpeg" alt="Rap Universe" className="w-10 h-10 rounded-full border-2 border-white" />
                        <div>
                          <h3 className="text-lg font-bold text-white">RAP UNIVERSE</h3>
                          <p className="text-white/70 text-xs">1ÈRE ÉDITION • 2026</p>
                        </div>
                      </div>
                      <Badge className="bg-white text-purple-600 font-bold">+ COCKTAIL</Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="bg-white p-2 rounded-lg">
                        <QRCodeSVG value={`${typeof window !== 'undefined' ? window.location.origin : ''}/scan?q=${ticket.ticketCode}`} size={100} level="H" />
                      </div>
                      <div className="flex-1 text-sm">
                        <div><span className="text-zinc-500">Nom:</span> <span className="text-white font-medium">{ticket.name}</span></div>
                        <div><span className="text-zinc-500">Email:</span> <span className="text-white">{ticket.email}</span></div>
                        <div><span className="text-zinc-500">Prix:</span> <span className="text-purple-400 font-bold">{ticket.price.toLocaleString('fr-FR')} FCFA</span></div>
                        <div className="mt-2 pt-2 border-t border-zinc-700"><span className="text-purple-300 font-mono text-xs">{ticket.shortCode}</span></div>
                      </div>
                    </div>
                    <Separator className="my-4 bg-zinc-700" />
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div><Calendar className="w-4 h-4 text-purple-400 mx-auto" /><span className="text-zinc-500">Date</span><br/><span className="text-white">11 Avril</span></div>
                      <div><Clock className="w-4 h-4 text-purple-400 mx-auto" /><span className="text-zinc-500">Heure</span><br/><span className="text-white">15H00</span></div>
                      <div><MapPin className="w-4 h-4 text-purple-400 mx-auto" /><span className="text-zinc-500">Lieu</span><br/><span className="text-white">La'Madre</span></div>
                    </div>
                    <Button onClick={downloadPDF} disabled={isDownloading} className="w-full mt-4 bg-gradient-to-r from-purple-500 to-red-500 text-white font-bold">
                      {isDownloading ? 'GÉNÉRATION PDF...' : <><FileText className="w-4 h-4 mr-2" />TÉLÉCHARGER PDF</>}
                    </Button>
                  </CardContent>
                  <div className="bg-green-500/10 border-t border-green-500/30 p-3 text-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
                    <p className="text-green-400 font-semibold text-sm">TICKET GÉNÉRÉ !</p>
                  </div>
                </Card>
              ) : (
                <Card className="bg-zinc-900/50 border-zinc-800 border-dashed">
                  <CardContent className="py-12 text-center">
                    <Ticket className="w-16 h-16 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500">Votre ticket apparaîtra ici</p>
                  </CardContent>
                </Card>
              )}

              <Card className="bg-zinc-900/50 border-zinc-800 mt-4">
                <CardContent className="py-3">
                  <div className="flex items-start gap-2">
                    <Lock className="w-4 h-4 text-purple-400 mt-0.5" />
                    <div className="text-xs">
                      <p className="text-purple-400 font-semibold">SÉCURITÉ</p>
                      <ul className="text-zinc-500 mt-1 space-y-0.5">
                        <li>• QR code unique</li>
                        <li>• PDF téléchargeable</li>
                        <li>• Ticket non transférable</li>
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
      <footer className="relative z-10 border-t border-zinc-800 bg-black/50 mt-8 py-4">
        <div className="container mx-auto px-4 text-center text-sm">
          <p className="text-zinc-600">© 2026 RAP UNIVERSE • 1ère Édition</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <a href="tel:0161168081" className="text-zinc-500 hover:text-purple-400"><Phone className="w-3 h-3 inline mr-1" />0161168081</a>
            <a href="tel:0153045098" className="text-zinc-500 hover:text-purple-400"><Phone className="w-3 h-3 inline mr-1" />0153045098</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
