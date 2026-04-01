'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, AlertCircle, Ticket, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface ValidationResult {
  success: boolean
  status: string
  message: string
  subMessage?: string
  ticket?: {
    shortCode: string
    name: string
    email: string
    ticketType: string
    price: number
    usedAt?: string
  }
}

function ScanResultContent() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q')
  
  const [isValidating, setIsValidating] = useState(false)
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [validated, setValidated] = useState(false)

  useEffect(() => {
    if (q && !validated) {
      validateTicket(q)
    }
  }, [q])

  const validateTicket = async (code: string) => {
    setIsValidating(true)
    setResult(null)
    
    try {
      const res = await fetch('/api/tickets/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketCode: code })
      })
      const data = await res.json()
      setResult(data)
      setValidated(true)
    } catch {
      setResult({
        success: false,
        status: 'ERROR',
        message: 'Erreur de connexion',
        subMessage: 'Impossible de contacter le serveur'
      })
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-red-900/20" />
      
      <Card className="relative z-10 w-full max-w-md bg-zinc-900/90 backdrop-blur-sm border-zinc-800">
        <CardContent className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <img src="/logo-rap-universe.jpeg" alt="Rap Universe" className="w-16 h-16 mx-auto rounded-full border-2 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)] mb-3" />
            <h1 className="text-2xl font-bold text-white">RAP UNIVERSE</h1>
            <p className="text-zinc-500 text-sm font-mono">VALIDATION DE TICKET</p>
          </div>

          {/* Code détecté */}
          {q && (
            <div className="bg-zinc-800 rounded-lg p-3 mb-4 text-center">
              <p className="text-zinc-500 text-xs mb-1">Code scanné</p>
              <p className="text-purple-400 font-mono text-sm break-all">{q.substring(0, 20)}...</p>
            </div>
          )}

          {/* Loading */}
          {isValidating && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
              <p className="text-zinc-400">Validation en cours...</p>
            </div>
          )}

          {/* Result */}
          {!isValidating && result && (
            <div className={`p-6 rounded-xl ${
              result.status === 'VALID' ? 'bg-green-500/10 border border-green-500/30' :
              result.status === 'ALREADY_USED' ? 'bg-orange-500/10 border border-orange-500/30' :
              'bg-red-500/10 border border-red-500/30'
            }`}>
              <div className="flex items-center gap-4 mb-4">
                <div className={`p-3 rounded-full ${
                  result.status === 'VALID' ? 'bg-green-500/20' :
                  result.status === 'ALREADY_USED' ? 'bg-orange-500/20' :
                  'bg-red-500/20'
                }`}>
                  {result.status === 'VALID' ? <CheckCircle className="w-8 h-8 text-green-400" /> :
                   result.status === 'ALREADY_USED' ? <AlertCircle className="w-8 h-8 text-orange-400" /> :
                   <XCircle className="w-8 h-8 text-red-400" />}
                </div>
                <div>
                  <p className={`text-xl font-bold ${
                    result.status === 'VALID' ? 'text-green-400' :
                    result.status === 'ALREADY_USED' ? 'text-orange-400' :
                    'text-red-400'
                  }`}>
                    {result.message}
                  </p>
                  {result.subMessage && (
                    <p className="text-zinc-400 text-sm">{result.subMessage}</p>
                  )}
                </div>
              </div>

              {/* Ticket details */}
              {result.ticket && (
                <div className="mt-4 pt-4 border-t border-zinc-700">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-purple-500 text-white">
                      TICKET - 2000 FCFA
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Nom</span>
                      <span className="text-white font-medium">{result.ticket.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Code</span>
                      <span className="text-purple-400 font-mono">{result.ticket.shortCode}</span>
                    </div>
                    {result.ticket.usedAt && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Scanné le</span>
                        <span className="text-orange-400">{new Date(result.ticket.usedAt).toLocaleString('fr-FR')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No code */}
          {!q && !isValidating && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
              <p className="text-zinc-400">Aucun code détecté dans l'URL</p>
              <p className="text-zinc-600 text-sm mt-2">Scannez un QR code valide</p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full border-zinc-700 text-zinc-400">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Accueil
              </Button>
            </Link>
            <Link href="/admin" className="flex-1">
              <Button className="w-full bg-gradient-to-r from-purple-500 to-red-500 text-white font-bold">
                Admin
              </Button>
            </Link>
          </div>
          
          {/* Contact */}
          <div className="mt-4 text-center text-xs text-zinc-600">
            <p>Contact: 0161168081 / 0153045098</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
      </div>
    }>
      <ScanResultContent />
    </Suspense>
  )
}
