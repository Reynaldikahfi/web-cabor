// PATH: src/app/api/players/route.js
import getDb from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    const db = getDb();

    if (groupId) {
      const players = db.prepare(
        'SELECT id, name FROM players WHERE group_id = ? ORDER BY name ASC'
      ).all(parseInt(groupId));
      return Response.json(players);
    }

    // Return all players if no filter
    const players = db.prepare('SELECT id, name, group_id FROM players ORDER BY group_id ASC, name ASC').all();
    return Response.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    return Response.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('token');
    if (!tokenCookie || !verifyToken(tokenCookie.value)) {
      return Response.json({ error: 'Tidak terautorisasi' }, { status: 401 });
    }

    const { name, group_id } = await request.json();
    if (!name || !group_id) {
      return Response.json(
        { error: 'Nama dan group_id wajib diisi' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Cek apakah pemain sudah terdaftar di grup ini (di sport manapun)
    const existing = db.prepare(
      'SELECT id FROM players WHERE name = ? AND group_id = ? LIMIT 1'
    ).get(name.trim(), parseInt(group_id));
    if (existing) {
      return Response.json({ error: 'Pemain sudah terdaftar di grup ini' }, { status: 400 });
    }

    // Insert satu record dengan sport_id default 1 agar global
    db.prepare(
      'INSERT INTO players (name, group_id, sport_id) VALUES (?, ?, ?)'
    ).run(name.trim(), parseInt(group_id), 1);

    return Response.json({
      success: true,
      message: 'Pemain berhasil ditambahkan',
    });
  } catch (error) {
    console.error('Error adding player:', error);
    return Response.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
