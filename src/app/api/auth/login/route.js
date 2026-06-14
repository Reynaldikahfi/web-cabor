import getDb from '@/lib/db';
import { signToken, comparePassword } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return Response.json(
        { error: 'Username dan password wajib diisi' },
        { status: 400 }
      );
    }

    const db = getDb();
    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);

    if (!admin || !comparePassword(password, admin.password_hash)) {
      return Response.json(
        { error: 'Username atau password salah' },
        { status: 401 }
      );
    }

    const token = signToken({ id: admin.id, username: admin.username });

    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return Response.json({
      success: true,
      message: 'Login berhasil',
      admin: { id: admin.id, username: admin.username }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    return Response.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
