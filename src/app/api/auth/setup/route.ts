import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

function getSetupSecretKey(): string {
  const key = process.env.SETUP_SECRET_KEY
  if (!key) {
    throw new Error('Configuration error: SETUP_SECRET_KEY manquant dans .env.local')
  }
  return key
}

export async function POST(request: Request) {
  try {
    const setupSecretKey = getSetupSecretKey()

    const existingAdmin = await db.admin.findFirst({
      where: { role: 'SUPER_ADMIN' }
    })

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Super admin déjà configuré' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { username, password, secretKey } = body

    if (!secretKey || secretKey !== setupSecretKey) {
      return NextResponse.json(
        { error: 'Clé secrète invalide' },
        { status: 403 }
      )
    }

    if (!username || !password || password.length < 8) {
      return NextResponse.json(
        { error: 'Username et mot de passe (min 8 caractères) requis' },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const admin = await db.admin.create({
      data: {
        username: username.toLowerCase(),
        passwordHash,
        role: 'SUPER_ADMIN'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Super admin créé avec succès',
      admin: { id: admin.id, username: admin.username, role: admin.role }
    })

  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la configuration' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const adminCount = await db.admin.count()
    return NextResponse.json({
      needsSetup: adminCount === 0
    })
  } catch {
    return NextResponse.json({ needsSetup: true })
  }
}
