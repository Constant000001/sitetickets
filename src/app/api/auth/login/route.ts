import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// Get JWT_SECRET at runtime, not at import time
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    console.error('JWT_SECRET is not defined in environment variables')
    throw new Error('Configuration error: JWT_SECRET missing')
  }
  return secret
}

export async function POST(request: Request) {
  try {
    const JWT_SECRET = getJwtSecret()
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Identifiants requis' },
        { status: 400 }
      )
    }

    // Find admin
    const admin = await db.admin.findUnique({
      where: { username: username.toLowerCase() }
    })

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Identifiants invalides' },
        { status: 401 }
      )
    }

    if (!admin.isActive) {
      return NextResponse.json(
        { success: false, error: 'Compte désactivé. Contactez le super-admin.' },
        { status: 403 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.passwordHash)

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Identifiants invalides' },
        { status: 401 }
      )
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        adminId: admin.id, 
        username: admin.username, 
        role: admin.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Create session in database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    await db.session.create({
      data: {
        adminId: admin.id,
        token,
        expiresAt,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    // Update last login
    await db.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() }
    })

    // Log successful login
    await db.scanLog.create({
      data: {
        action: 'LOGIN_SUCCESS',
        adminId: admin.id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      }
    })

    // Set HTTP-only cookie
    const cookieStore = await cookies()
    const isProduction = process.env.NODE_ENV === 'production'
    const cookieExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours
    
    cookieStore.set('admin_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      expires: cookieExpires,
      path: '/',
    })

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
