import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'

// Prix en FCFA - Ticket unique à 2000 FCFA
const TICKET_PRICE = 2000

const MAX_TICKETS = 150

function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'RU-2026-'
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function generateSecurityHash(ticketCode: string, email: string, timestamp: number): string {
  const data = `${ticketCode}:${email}:${timestamp}:RAP_UNIVERSE_SECRET`
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, phone, ticketType } = body

    // Validation des champs
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Nom et email sont requis' },
        { status: 400 }
      )
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Format email invalide' },
        { status: 400 }
      )
    }

    // Vérifier le nombre max de tickets
    const ticketCount = await db.ticket.count()
    if (ticketCount >= MAX_TICKETS) {
      return NextResponse.json(
        { error: 'Plus de tickets disponibles ! Événement complet.' },
        { status: 400 }
      )
    }

    // Vérifier si l'email a déjà acheté un ticket (anti-achat multiple)
    const existingTicket = await db.ticket.findFirst({
      where: { email: email.toLowerCase() }
    })
    if (existingTicket) {
      return NextResponse.json(
        { error: 'Un ticket a déjà été acheté avec cet email' },
        { status: 400 }
      )
    }

    // Générer les codes
    const ticketCode = uuidv4()
    let shortCode = generateShortCode()
    
    // S'assurer que le short code est unique
    while (await db.ticket.findUnique({ where: { shortCode } })) {
      shortCode = generateShortCode()
    }

    const timestamp = Date.now()
    const securityHash = generateSecurityHash(ticketCode, email.toLowerCase(), timestamp)

    // Créer le ticket
    const ticket = await db.ticket.create({
      data: {
        ticketCode,
        shortCode,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        ticketType: 'STANDARD', // Un seul type de ticket
        price: TICKET_PRICE,
        securityHash,
        purchaseIp: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    })

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketCode: ticket.ticketCode,
        shortCode: ticket.shortCode,
        name: ticket.name,
        email: ticket.email,
        phone: ticket.phone,
        ticketType: ticket.ticketType,
        price: ticket.price,
        createdAt: ticket.createdAt,
      },
    })

  } catch (error) {
    console.error('Error creating ticket:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du ticket' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    // Get token from Authorization header or cookie
    let token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      const cookieHeader = request.headers.get('cookie')
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').map(c => c.trim())
        const tokenCookie = cookies.find(c => c.startsWith('admin_token='))
        if (tokenCookie) {
          token = tokenCookie.split('=')[1]
        }
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const tickets = await db.ticket.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        shortCode: true,
        name: true,
        email: true,
        ticketType: true,
        price: true,
        isUsed: true,
        usedAt: true,
        createdAt: true,
      }
    })

    const stats = {
      total: tickets.length,
      used: tickets.filter(t => t.isUsed).length,
      standard: tickets.length, // Tous les tickets sont standard
      vip: 0,
      premium: 0,
      revenue: tickets.reduce((sum, t) => sum + t.price, 0),
    }

    return NextResponse.json({
      success: true,
      tickets,
      stats,
    })

  } catch (error) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des tickets' },
      { status: 500 }
    )
  }
}
