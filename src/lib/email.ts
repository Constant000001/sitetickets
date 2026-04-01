/**
 * RAP UNIVERSE — Utilitaire d'envoi d'email
 * Utilise Nodemailer avec SMTP configurable via variables d'environnement.
 * Si aucune config SMTP n'est définie, les emails sont loggués en console (dev).
 */

import nodemailer from 'nodemailer'

interface TicketEmailData {
  to: string
  name: string
  shortCode: string
  ticketCode: string
  price: number
  phone?: string | null
}

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    // Mode développement : logger les emails dans la console
    return null
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT ?? '587'),
    secure: parseInt(SMTP_PORT ?? '587') === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

function buildEmailHtml(data: TicketEmailData, appUrl: string): string {
  const scanUrl = `${appUrl}/scan?q=${data.ticketCode}`

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre ticket RAP UNIVERSE</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#7c3aed,#dc2626);border-radius:16px 16px 0 0;padding:40px 30px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:32px;font-weight:900;letter-spacing:3px;">RAP UNIVERSE</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:14px;letter-spacing:2px;">1ÈRE ÉDITION • 2026</p>
    </div>

    <!-- Main card -->
    <div style="background:#111111;border:1px solid rgba(124,58,237,0.3);border-top:none;border-radius:0 0 16px 16px;padding:35px 30px;">

      <!-- Greeting -->
      <p style="color:#a1a1aa;font-size:15px;margin:0 0 8px;">Salut,</p>
      <h2 style="color:#ffffff;font-size:22px;margin:0 0 24px;font-weight:700;">${data.name} 🎤</h2>

      <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 28px;">
        Ton ticket pour <strong style="color:#c084fc;">RAP UNIVERSE – 1ère Édition</strong> est confirmé !
        Présente le QR code ci-dessous à l'entrée.
      </p>

      <!-- Ticket box -->
      <div style="background:linear-gradient(135deg,rgba(124,58,237,0.15),rgba(220,38,38,0.15));border:1px solid rgba(124,58,237,0.4);border-radius:12px;padding:24px;margin-bottom:28px;">
        <div style="text-align:center;margin-bottom:20px;">
          <span style="background:rgba(124,58,237,0.2);color:#c084fc;font-family:monospace;font-size:18px;font-weight:700;padding:8px 16px;border-radius:8px;letter-spacing:2px;">${data.shortCode}</span>
        </div>

        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#71717a;font-size:13px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.06);">Titulaire</td>
            <td style="color:#ffffff;font-size:13px;font-weight:600;text-align:right;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.06);">${data.name}</td>
          </tr>
          <tr>
            <td style="color:#71717a;font-size:13px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.06);">Type</td>
            <td style="color:#ffffff;font-size:13px;font-weight:600;text-align:right;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.06);">TICKET STANDARD</td>
          </tr>
          <tr>
            <td style="color:#71717a;font-size:13px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.06);">Inclus</td>
            <td style="color:#f43f5e;font-size:13px;font-weight:600;text-align:right;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.06);">1 cocktail offert 🍹</td>
          </tr>
          <tr>
            <td style="color:#71717a;font-size:13px;padding:7px 0;">Prix payé</td>
            <td style="color:#c084fc;font-size:15px;font-weight:700;text-align:right;padding:7px 0;">${data.price.toLocaleString('fr-FR')} FCFA</td>
          </tr>
        </table>
      </div>

      <!-- Event info -->
      <div style="display:flex;justify-content:space-between;margin-bottom:28px;">
        <div style="text-align:center;flex:1;padding:14px 8px;background:rgba(255,255,255,0.04);border-radius:10px;margin:0 4px;">
          <div style="font-size:20px;margin-bottom:4px;">📅</div>
          <div style="color:#a1a1aa;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Date</div>
          <div style="color:#ffffff;font-size:13px;font-weight:600;margin-top:2px;">11 Avril 2026</div>
        </div>
        <div style="text-align:center;flex:1;padding:14px 8px;background:rgba(255,255,255,0.04);border-radius:10px;margin:0 4px;">
          <div style="font-size:20px;margin-bottom:4px;">🕓</div>
          <div style="color:#a1a1aa;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Heure</div>
          <div style="color:#ffffff;font-size:13px;font-weight:600;margin-top:2px;">15H00</div>
        </div>
        <div style="text-align:center;flex:1;padding:14px 8px;background:rgba(255,255,255,0.04);border-radius:10px;margin:0 4px;">
          <div style="font-size:20px;margin-bottom:4px;">📍</div>
          <div style="color:#a1a1aa;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Lieu</div>
          <div style="color:#ffffff;font-size:13px;font-weight:600;margin-top:2px;">La'Madre, Calavi</div>
        </div>
      </div>

      <!-- QR link -->
      <div style="text-align:center;padding:20px;background:rgba(124,58,237,0.08);border:1px dashed rgba(124,58,237,0.3);border-radius:10px;margin-bottom:28px;">
        <p style="color:#a1a1aa;font-size:13px;margin:0 0 10px;">Télécharge ton ticket PDF :</p>
        <a href="${scanUrl}" style="color:#c084fc;font-size:12px;text-decoration:none;font-family:monospace;word-break:break-all;">${scanUrl}</a>
        <p style="color:#52525b;font-size:11px;margin:12px 0 0;">⚠️ Ticket unique et non transférable.</p>
      </div>

      <!-- Security -->
      <div style="border-top:1px solid rgba(255,255,255,0.07);padding-top:20px;">
        <p style="color:#52525b;font-size:12px;line-height:1.6;margin:0;">
          🔒 Ce ticket est sécurisé par un QR code unique. Toute tentative de duplication sera détectée.
          Ne partage pas ce mail.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px 0 0;">
      <p style="color:#3f3f46;font-size:12px;margin:0;">© 2026 RAP UNIVERSE • Contact: 0161168081 / 0153045098</p>
      <p style="color:#3f3f46;font-size:11px;margin:6px 0 0;">Instagram: @rap.universe</p>
    </div>
  </div>
</body>
</html>`
}

export async function sendTicketEmail(data: TicketEmailData): Promise<{ success: boolean; error?: string }> {
  try {
    const appUrl = getAppUrl()
    const transporter = getTransporter()
    const fromAddress = process.env.SMTP_FROM ?? 'RAP UNIVERSE <noreply@rapuniverse.com>'
    const subject = `🎤 Ton ticket RAP UNIVERSE est prêt ! [${data.shortCode}]`
    const html = buildEmailHtml(data, appUrl)

    if (!transporter) {
      // Mode dev : afficher dans la console
      console.log('\n📧 ═══════════════════════════════════════')
      console.log('📧 EMAIL (mode dev — pas de SMTP configuré)')
      console.log(`📧 À: ${data.to}`)
      console.log(`📧 Sujet: ${subject}`)
      console.log(`📧 Ticket: ${data.shortCode}`)
      console.log('📧 ═══════════════════════════════════════\n')
      return { success: true }
    }

    await transporter.sendMail({
      from: fromAddress,
      to: data.to,
      subject,
      html,
      text: `Bonjour ${data.name},\n\nVotre ticket RAP UNIVERSE est confirmé !\n\nCode: ${data.shortCode}\nDate: 11 Avril 2026 à 15H00\nLieu: La'Madre, Calavi\nPrix: ${data.price.toLocaleString('fr-FR')} FCFA + 1 cocktail offert\n\nContact: 0161168081 / 0153045098`,
    })

    return { success: true }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }
  }
}
