import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET manquant dans .env.local')
  return secret
}

// Extraire le token depuis Authorization header OU cookie HTTP-only
function extractToken(request: Request): string | null {
  // 1. Header Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7)

  // 2. Cookie HTTP-only admin_token (utilisé quand la page /scan est ouverte après login)
  const cookieHeader = request.headers.get('cookie') ?? ''
  const tokenCookie = cookieHeader.split(';').map(c => c.trim()).find(c => c.startsWith('admin_token='))
  if (tokenCookie) return tokenCookie.split('=').slice(1).join('=')

  return null
}

export async function POST(request: Request) {
  try {
    const JWT_SECRET = getJwtSecret()
    const token = extractToken(request)

    if (!token) {
      return NextResponse.json(
        { success: false, status: 'UNAUTHORIZED', message: 'Authentification requise. Connectez-vous d\'abord sur /admin' },
        { status: 401 }
      )
    }

    // Vérifier la signature JWT
    let decoded: { adminId: string; username: string; role: string }
    try {
      decoded = jwt.verify(token, JWT_SECRET) as typeof decoded
    } catch {
      return NextResponse.json(
        { success: false, status: 'INVALID_TOKEN', message: 'Token invalide ou expiré. Reconnectez-vous.' },
        { status: 401 }
      )
    }

    // Vérifier que la session est active en base
    const session = await db.session.findFirst({
      where: { token, expiresAt: { gt: new Date() } },
      include: { admin: { select: { id: true, username: true, isActive: true } } }
    })

    if (!session || !session.admin.isActive) {
      return NextResponse.json(
        { success: false, status: 'SESSION_EXPIRED', message: 'Session expirée. Reconnectez-vous.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { ticketCode } = body

    if (!ticketCode?.trim()) {
      return NextResponse.json({
        success: false,
        status: 'MISSING_CODE',
        message: 'Code de ticket requis',
      })
    }

    const cleanCode = ticketCode.trim().toUpperCase()

    // Chercher par shortCode ou ticketCode (UUID complet dans le QR)
    const ticket = await db.ticket.findFirst({
      where: {
        OR: [
          { shortCode: cleanCode },
          { ticketCode: ticketCode.trim() }
        ]
      }
    })

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

    if (!ticket) {
      await db.scanLog.create({
        data: {
          action: 'SCAN_INVALID',
          adminId: session.admin.id,
          details: JSON.stringify({ attemptedCode: ticketCode }),
          ipAddress: ip,
        }
      })

      return NextResponse.json({
        success: false,
        status: 'NOT_FOUND',
        message: '❌ TICKET NON TROUVÉ',
        subMessage: 'Ce code n\'existe pas dans la base de données',
      })
    }

    if (ticket.isUsed) {
      await db.scanLog.create({
        data: {
          action: 'SCAN_DUPLICATE',
          adminId: session.admin.id,
          ticketId: ticket.id,
          details: JSON.stringify({ ticketCode: ticket.shortCode, originalScanTime: ticket.usedAt }),
          ipAddress: ip,
        }
      })

      return NextResponse.json({
        success: false,
        status: 'ALREADY_USED',
        message: '⚠️ TICKET DÉJÀ UTILISÉ',
        subMessage: `Scanné le ${ticket.usedAt ? new Date(ticket.usedAt).toLocaleString('fr-FR') : 'N/A'}`,
        ticket: {
          shortCode: ticket.shortCode,
          name: ticket.name,
          email: ticket.email,
          ticketType: ticket.ticketType,
          price: ticket.price,
          usedAt: ticket.usedAt,
        },
      })
    }

    // ✅ Valider le ticket
    const updatedTicket = await db.ticket.update({
      where: { id: ticket.id },
      data: { isUsed: true, usedAt: new Date(), usedBy: session.admin.id },
    })

    await db.scanLog.create({
      data: {
        action: 'SCAN_SUCCESS',
        adminId: session.admin.id,
        ticketId: ticket.id,
        details: JSON.stringify({ ticketCode: ticket.shortCode }),
        ipAddress: ip,
      }
    })

    return NextResponse.json({
      success: true,
      status: 'VALID',
      message: '✅ TICKET VALIDÉ',
      subMessage: 'Entrée autorisée',
      ticket: {
        shortCode: updatedTicket.shortCode,
        name: updatedTicket.name,
        email: updatedTicket.email,
        ticketType: updatedTicket.ticketType,
        price: updatedTicket.price,
        usedAt: updatedTicket.usedAt,
      },
    })

  } catch (error) {
    console.error('Error validating ticket:', error)
    return NextResponse.json(
      { success: false, status: 'ERROR', message: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
