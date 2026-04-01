import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    if (!code) {
      return NextResponse.json(
        { error: 'Code de ticket requis' },
        { status: 400 }
      )
    }

    const ticket = await db.ticket.findUnique({
      where: { ticketCode: code },
    })

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket non trouvé', found: false },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      found: true,
      ticket: {
        id: ticket.id,
        ticketCode: ticket.ticketCode,
        name: ticket.name,
        email: ticket.email,
        phone: ticket.phone,
        ticketType: ticket.ticketType,
        price: ticket.price,
        isUsed: ticket.isUsed,
        usedAt: ticket.usedAt,
        createdAt: ticket.createdAt,
      },
    })
  } catch (error) {
    console.error('Error fetching ticket:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du ticket' },
      { status: 500 }
    )
  }
}
