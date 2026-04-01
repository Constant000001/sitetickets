import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import fs from 'fs/promises'
import path from 'path'

const TICKET_PRICE = 2000

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { ticketCode } = body

    if (!ticketCode) {
      return NextResponse.json({ error: 'Code ticket requis' }, { status: 400 })
    }

    // Find ticket
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

    // Get the base URL for the QR code
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const baseUrl = `${protocol}://${host}`
    
    // The QR code URL (embedded in QR, not displayed)
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
    
    // Colors
    const purpleColor = '#9B59B6'
    const grayColor = '#666666'
    const lightGray = '#999999'

    // Try to add logo
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo-rap-universe.jpeg')
      const logoBuffer = await fs.readFile(logoPath)
      const logoBase64 = `data:image/jpeg;base64,${logoBuffer.toString('base64')}`
      const logoSize = 35
      doc.addImage(logoBase64, 'JPEG', (pageWidth - logoSize) / 2, 12, logoSize, logoSize)
    } catch {
      // Logo not found, skip
    }

    // Title
    doc.setFontSize(28)
    doc.setTextColor(purpleColor)
    doc.setFont('helvetica', 'bold')
    doc.text('RAP UNIVERSE', pageWidth / 2, 58, { align: 'center' })

    // Subtitle
    doc.setFontSize(14)
    doc.setTextColor(grayColor)
    doc.setFont('helvetica', 'normal')
    doc.text('1ère Édition • Where Legends and Rhymes Rise', pageWidth / 2, 66, { align: 'center' })

    // QR Code
    const qrSize = 55
    const qrX = (pageWidth - qrSize) / 2
    doc.addImage(qrBase64, 'PNG', qrX, 78, qrSize, qrSize)

    // Scan instruction
    doc.setFontSize(12)
    doc.setTextColor('#333333')
    doc.setFont('helvetica', 'bold')
    doc.text('Scannez ce QR code à l\'entrée', pageWidth / 2, 143, { align: 'center' })

    // Ticket code
    doc.setFontSize(16)
    doc.setTextColor(purpleColor)
    doc.setFont('courier', 'bold')
    doc.text(ticket.shortCode, pageWidth / 2, 153, { align: 'center' })

    // Ticket type with cocktail
    doc.setFontSize(18)
    doc.setTextColor(purpleColor)
    doc.setFont('helvetica', 'bold')
    doc.text('TICKET', pageWidth / 2, 168, { align: 'center' })
    
    // Cocktail offer
    doc.setFontSize(12)
    doc.setTextColor('#E91E63')
    doc.text('1 cocktail offert 🍹', pageWidth / 2, 178, { align: 'center' })

    // Price
    doc.setFontSize(22)
    doc.setTextColor('#000000')
    doc.text(`${TICKET_PRICE.toLocaleString('fr-FR')} FCFA`, pageWidth / 2, 192, { align: 'center' })

    // Separator
    doc.setDrawColor('#cccccc')
    doc.line(30, 200, pageWidth - 30, 200)

    // Info section
    doc.setFontSize(11)
    const startY = 210
    const lineHeight = 10
    
    const infoItems = [
      { label: 'Nom:', value: ticket.name },
      { label: 'Email:', value: ticket.email },
      { label: 'Téléphone:', value: ticket.phone || 'Non renseigné' }
    ]

    infoItems.forEach((item, index) => {
      const y = startY + (index * lineHeight)
      doc.setTextColor(grayColor)
      doc.setFont('helvetica', 'bold')
      doc.text(item.label, 50, y, { align: 'right' })
      doc.setTextColor('#000000')
      doc.setFont('helvetica', 'normal')
      doc.text(item.value, 55, y)
    })

    // Separator
    doc.line(30, 245, pageWidth - 30, 245)

    // Event info
    doc.setFontSize(10)
    doc.setTextColor('#333333')
    doc.text('Date: Samedi 11 Avril 2026  |  Heure: 15H00  |  Lieu: La\'Madre, Calavi', pageWidth / 2, 255, { align: 'center' })

    // Contact
    doc.setFontSize(9)
    doc.setTextColor(grayColor)
    doc.text('Contact: 0161168081 / 0153045098  |  Instagram: @rap.universe', pageWidth / 2, 263, { align: 'center' })

    // Security notes
    doc.setFontSize(8)
    doc.setTextColor(lightGray)
    doc.text('Présentez ce ticket avec le QR code à l\'entrée', pageWidth / 2, 275, { align: 'center' })
    doc.text('Ticket unique et non transférable', pageWidth / 2, 281, { align: 'center' })

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
