import getDb from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function PATCH(request, { params }) {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('token');
    if (!tokenCookie || !verifyToken(tokenCookie.value)) {
      return Response.json({ error: 'Tidak terautorisasi' }, { status: 401 });
    }

    const { id } = await params;
    const { pool } = await request.json();

    if (!['A', 'B'].includes(pool)) {
      return Response.json({ error: 'Pool harus A atau B' }, { status: 400 });
    }

    const db = getDb();
    const result = db.prepare('UPDATE groups SET pool = ? WHERE id = ?')
      .run(pool, parseInt(id));

    if (result.changes === 0) {
      return Response.json({ error: 'Grup tidak ditemukan' }, { status: 404 });
    }

    return Response.json({ success: true, message: 'Pool berhasil diperbarui' });
  } catch (error) {
    console.error('Error updating group pool:', error);
    return Response.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
