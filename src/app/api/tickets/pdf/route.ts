import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import fs from 'fs/promises'
import path from 'path'

const TICKET_PRICE = 2000

function getBaseUrl(request: Request): string {
  // 1. Variable d'environnement explicite (priorité absolue)
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')

  // 2. Détection depuis les headers (proxy, Vercel, Netlify…)
  const host = request.headers.get('host') ?? 'localhost:3000'
  const proto = request.headers.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { ticketCode } = body

    if (!ticketCode) {
      return NextResponse.json({ error: 'Code ticket requis' }, { status: 400 })
    }

    const ticket = await db.ticket.findFirst({
      where: {
        OR: [
          { shortCode: ticketCode.toUpperCase() },
          { ticketCode: ticketCode }
        ]
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket non trouvé' }, { status: 404 })
    }

    const baseUrl = getBaseUrl(request)
    const scanUrl = `${baseUrl}/scan?q=${ticket.ticketCode}`

    // Generate QR code as base64
    const qrBase64 = await QRCode.toDataURL(scanUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })

    // Create PDF with jsPDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // Top Dark Header for the A4 Page
    doc.setFillColor(10, 10, 10)
    doc.rect(0, 0, pageWidth, 40, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(26)
    doc.setFont('helvetica', 'bold')
    doc.text('RAP UNIVERSE', pageWidth / 2, 22, { align: 'center' })
    doc.setFontSize(11)
    doc.setTextColor(150, 150, 150)
    doc.setFont('helvetica', 'normal')
    doc.text('VOTRE E-TICKET OFFICIEL', pageWidth / 2, 30, { align: 'center' })

    // Ticket Card Block
    const ticX = 15
    const ticY = 55
    const ticW = 180
    const ticH = 85

    // Ticket Body (Dark Zinc)
    doc.setFillColor(24, 24, 27) // #18181b
    doc.roundedRect(ticX, ticY, ticW, ticH, 4, 4, 'F')

    // Inside Ticket Header (Purple)
    doc.setFillColor(124, 58, 237) // #7c3aed
    doc.roundedRect(ticX, ticY, ticW, 25, 4, 4, 'F')
    doc.rect(ticX, ticY + 15, ticW, 10, 'F') // Flatten the bottom corners

    // Header Content
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('BILLETERIE OFFICIELLE', ticX + 10, ticY + 12)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(220, 220, 220)
    doc.text('RAP UNIVERSE • 1ÈRE ÉDITION', ticX + 10, ticY + 19)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('11 AVR. 2026', ticX + ticW - 10, ticY + 13, { align: 'right' })

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('15H00 • CALAVI', ticX + ticW - 10, ticY + 19, { align: 'right' })

    // Ticket Body Content - Guest Details
    doc.setTextColor(161, 161, 170) // #a1a1aa
    doc.setFontSize(8)
    doc.text('TITULAIRE', ticX + 10, ticY + 38)
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(ticket.name.toUpperCase(), ticX + 10, ticY + 45)

    // Category
    doc.setTextColor(161, 161, 170)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('CATÉGORIE', ticX + 10, ticY + 58)
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('TICKET STANDARD', ticX + 10, ticY + 64)

    // Price
    doc.setTextColor(161, 161, 170)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('MONTANT', ticX + 75, ticY + 58)
    doc.setTextColor(167, 139, 250) // #a78bfa
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`${TICKET_PRICE} FCFA`, ticX + 75, ticY + 64)

    // Included Perks
    doc.setTextColor(161, 161, 170)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('INCLUS', ticX + 10, ticY + 75)
    doc.setTextColor(244, 63, 94) // #f43f5e
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('1 COCKTAIL OFFERT', ticX + 10, ticY + 80)

    // Separator Line
    doc.setDrawColor(63, 63, 70) // #3f3f46
    doc.line(ticX + 130, ticY + 15, ticX + 130, ticY + ticH - 15)

    // QR Code Placement
    const qrSize = 40
    const qrX = ticX + 135
    const qrY = ticY + 30

    // White background block for QR compatibility
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 3, 3, 'F')
    doc.addImage(qrBase64, 'PNG', qrX, qrY, qrSize, qrSize)

    // Ticket Number
    doc.setTextColor(161, 161, 170)
    doc.setFontSize(10)
    doc.setFont('courier', 'bold')
    doc.text(ticket.shortCode, qrX + (qrSize / 2), qrY + qrSize + 8, { align: 'center' })

    // Instructions Section
    const instrY = ticY + ticH + 20

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('INSTRUCTIONS IMPORTANTES', 15, instrY)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)

    const instructions = [
      "1. Ce e-ticket est personnel et incessible. Une pièce d'identité pourra vous être demandée.",
      "2. Présentez ce ticket (imprimé ou sur votre smartphone) au contrôle d'accès.",
      "3. Le QR code ne peut être scanné qu'une seule fois. Toute copie sera refusée.",
      "4. Les portes ouvrent à 15H00 le Samedi 11 Avril 2026 à La'Madre - Calavi.",
      "5. Pour toute question, contactez le 0161168081 ou 0153045098."
    ]

    let currY = instrY + 10
    instructions.forEach(line => {
      doc.text(line, 15, currY)
      currY += 8
    })

    // Footer
    const footerY = 280
    doc.setDrawColor(200, 200, 200)
    doc.line(15, footerY - 10, pageWidth - 15, footerY - 10)

    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text('RAP UNIVERSE - BILLETTERIE GÉNÉRÉE AUTOMATIQUEMENT', pageWidth / 2, footerY, { align: 'center' })
    doc.text(`DATE D'ÉMISSION: ${new Date().toLocaleString('fr-FR')}`, pageWidth / 2, footerY + 5, { align: 'center' })

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    // Return PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ticket-rap-universe-${ticket.shortCode}.pdf"`,
      },
    })

  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF: ' + (error instanceof Error ? error.message : 'Erreur inconnue') },
      { status: 500 }
    )
  }
}
