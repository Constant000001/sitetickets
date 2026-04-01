import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'

const TICKET_PRICE = 2000
const MAX_TICKETS = 150

// ── Rate limiting en mémoire (par IP) ─────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 3         // max 3 tickets par IP
const RATE_LIMIT_WINDOW = 15 * 60 * 1000  // fenêtre de 15 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

// ── Helpers ───────────────────────────────────────────────────────
function getTicketSecret(): string {
  return process.env.TICKET_SECURITY_SECRET ?? 'fallback_dev_secret_change_in_prod'
}

function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'RU-2026-'
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function generateSecurityHash(ticketCode: string, email: string, timestamp: number): string {
  const secret = getTicketSecret()
  const data = `${ticketCode}:${email}:${timestamp}:${secret}`
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32)
}

function sanitizeString(str: string, maxLen = 200): string {
  return str.trim().substring(0, maxLen).replace(/[<>"']/g, '')
}

// ── POST /api/tickets ─────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? 'unknown'

    if (ip !== 'unknown' && !checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { name, email, phone } = body

    // Validation et sanitisation
    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Nom et email sont requis' }, { status: 400 })
    }

    const cleanName = sanitizeString(name, 100)
    const cleanEmail = sanitizeString(email, 254).toLowerCase()
    const cleanPhone = phone?.trim() ? sanitizeString(phone, 30) : null

    if (cleanName.length < 2) {
      return NextResponse.json({ error: 'Le nom doit contenir au moins 2 caractères' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: 'Format email invalide' }, { status: 400 })
    }

    // Vérifier la limite de places
    const ticketCount = await db.ticket.count()
    if (ticketCount >= MAX_TICKETS) {
      return NextResponse.json({ error: 'Plus de tickets disponibles ! Événement complet.' }, { status: 400 })
    }

    // Anti-doublon email
    const existingTicket = await db.ticket.findFirst({ where: { email: cleanEmail } })
    if (existingTicket) {
      return NextResponse.json({ error: 'Un ticket a déjà été acheté avec cet email' }, { status: 400 })
    }

    // Générer les codes
    const ticketCode = uuidv4()
    let shortCode = generateShortCode()
    while (await db.ticket.findUnique({ where: { shortCode } })) {
      shortCode = generateShortCode()
    }

    const timestamp = Date.now()
    const securityHash = generateSecurityHash(ticketCode, cleanEmail, timestamp)

    const ticket = await db.ticket.create({
      data: {
        ticketCode,
        shortCode,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        ticketType: 'STANDARD',
        price: TICKET_PRICE,
        securityHash,
        purchaseIp: ip,
        userAgent: (request.headers.get('user-agent') ?? 'unknown').substring(0, 500),
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
    return NextResponse.json({ error: 'Erreur lors de la création du ticket' }, { status: 500 })
  }
}

// ── GET /api/tickets (admin seulement) ────────────────────────────
export async function GET(request: Request) {
  try {
    // Lire le token depuis le header Authorization OU le cookie HTTP-only
    let token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      const cookieHeader = request.headers.get('cookie') ?? ''
      const tokenCookie = cookieHeader.split(';').map(c => c.trim()).find(c => c.startsWith('admin_token='))
      if (tokenCookie) token = tokenCookie.split('=').slice(1).join('=')
    }

    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que la session existe et n'est pas expirée
    const session = await db.session.findFirst({
      where: { token, expiresAt: { gt: new Date() } },
      include: { admin: { select: { isActive: true } } }
    })

    if (!session || !session.admin.isActive) {
      return NextResponse.json({ error: 'Session invalide ou expirée' }, { status: 401 })
    }

    const tickets = await db.ticket.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        shortCode: true,
        name: true,
        email: true,
        phone: true,
        ticketType: true,
        price: true,
        isUsed: true,
        usedAt: true,
        usedBy: true,
        createdAt: true,
      }
    })

    const stats = {
      total: tickets.length,
      used: tickets.filter(t => t.isUsed).length,
      revenue: tickets.reduce((sum, t) => sum + t.price, 0),
    }

    return NextResponse.json({ success: true, tickets, stats })

  } catch (error) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des tickets' }, { status: 500 })
  }
}
