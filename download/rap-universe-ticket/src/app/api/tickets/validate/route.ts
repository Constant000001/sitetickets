import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex')

export async function POST(request: Request) {
  try {
    // Vérifier l'authentification admin
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { success: false, status: 'UNAUTHORIZED', message: 'Authentification requise' },
        { status: 401 }
      )
    }

    let decoded: { adminId: string; username: string; role: string }
    try {
      decoded = jwt.verify(token, JWT_SECRET) as typeof decoded
    } catch {
      return NextResponse.json(
        { success: false, status: 'INVALID_TOKEN', message: 'Token invalide ou expiré' },
        { status: 401 }
      )
    }

    // Vérifier la session
    const session = await db.session.findFirst({
      where: { token, expiresAt: { gt: new Date() } },
      include: { admin: true }
    })

    if (!session) {
      return NextResponse.json(
        { success: false, status: 'SESSION_EXPIRED', message: 'Session expirée' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { ticketCode } = body

    // Accepter le short code ou le ticket code complet
    if (!ticketCode) {
      return NextResponse.json({
        success: false,
        status: 'MISSING_CODE',
        message: 'Code de ticket requis',
      })
    }

    // Chercher le ticket par shortCode ou ticketCode
    const ticket = await db.ticket.findFirst({
      where: {
        OR: [
          { shortCode: ticketCode.toUpperCase() },
          { ticketCode: ticketCode }
        ]
      }
    })

    if (!ticket) {
      // Log tentative de scan invalide
      await db.scanLog.create({
        data: {
          action: 'SCAN_INVALID',
          adminId: session.admin.id,
          details: JSON.stringify({ attemptedCode: ticketCode }),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
        }
      })

      return NextResponse.json({
        success: false,
        status: 'NOT_FOUND',
        message: '❌ TICKET NON TROUVÉ',
        subMessage: 'Ce code n\'existe pas dans la base de données',
      })
    }

    // Vérifier si déjà utilisé
    if (ticket.isUsed) {
      await db.scanLog.create({
        data: {
          action: 'SCAN_DUPLICATE',
          adminId: session.admin.id,
          ticketId: ticket.id,
          details: JSON.stringify({ 
            ticketCode: ticket.shortCode,
            originalScanTime: ticket.usedAt 
          }),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
        }
      })

      return NextResponse.json({
        success: false,
        status: 'ALREADY_USED',
        message: '⚠️ TICKET DÉJÀ UTILISÉ',
        subMessage: `Ce ticket a été scanné le ${ticket.usedAt ? new Date(ticket.usedAt).toLocaleString('fr-FR') : 'N/A'}`,
        ticket: {
          shortCode: ticket.shortCode,
          name: ticket.name,
          ticketType: ticket.ticketType,
          usedAt: ticket.usedAt,
        },
      })
    }

    // Valider le ticket
    const updatedTicket = await db.ticket.update({
      where: { id: ticket.id },
      data: {
        isUsed: true,
        usedAt: new Date(),
        usedBy: session.admin.id,
      },
    })

    // Log scan réussi
    await db.scanLog.create({
      data: {
        action: 'SCAN_SUCCESS',
        adminId: session.admin.id,
        ticketId: ticket.id,
        details: JSON.stringify({ 
          ticketCode: ticket.shortCode,
          ticketType: ticket.ticketType 
        }),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
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
