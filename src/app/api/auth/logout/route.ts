import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    // Get token from cookie
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value

    // Delete session from database
    if (token) {
      try {
        await db.session.deleteMany({
          where: { token }
        })
      } catch {
        // Ignore database errors
      }
    }

    // Clear the HTTP-only cookie
    cookieStore.delete('admin_token')

    return NextResponse.json({ success: true })
  } catch {
    // Still clear cookie on error
    const cookieStore = await cookies()
    cookieStore.delete('admin_token')
    return NextResponse.json({ success: true })
  }
}
