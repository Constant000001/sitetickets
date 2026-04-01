import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

// Get JWT_SECRET at runtime
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    console.error('JWT_SECRET is not defined in environment variables')
    throw new Error('Configuration error: JWT_SECRET missing')
  }
  return secret
}

export async function GET() {
  try {
    const JWT_SECRET = getJwtSecret()
    
    // Read token from HTTP-only cookie
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value

    console.log('🔍 Verify request - Token found:', !!token)

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Verify JWT
    let decoded: { adminId: string; username: string; role: string }
    try {
      decoded = jwt.verify(token, JWT_SECRET) as typeof decoded
      console.log('✅ JWT verified for:', decoded.username)
    } catch {
      // Token invalid, clear cookie
      cookieStore.delete('admin_token')
      console.log('❌ JWT verification failed')
      return NextResponse.json(
        { success: false, error: 'Session expirée' },
        { status: 401 }
      )
    }

    // Check session in database
    const session = await db.session.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() }
      },
      include: { admin: true }
    })

    if (!session || !session.admin.isActive) {
      cookieStore.delete('admin_token')
      console.log('❌ Session not found or admin inactive')
      return NextResponse.json(
        { success: false, error: 'Session invalide ou expirée' },
        { status: 401 }
      )
    }

    console.log('✅ Session valid for:', session.admin.username)

    return NextResponse.json({
      success: true,
      admin: {
        id: session.admin.id,
        username: session.admin.username,
        role: session.admin.role
      }
    })

  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
