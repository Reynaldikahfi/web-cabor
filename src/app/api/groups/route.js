import getDb from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sportId = searchParams.get('sport_id');

    const db = getDb();

    if (sportId) {
      const rows = db.prepare(`
        SELECT 
          g.id AS group_id, 
          g.name AS group_name, 
          g.pool AS group_pool,
          p.id AS player_id, 
          p.name AS player_name
        FROM groups g
        LEFT JOIN players p ON p.group_id = g.id
        ORDER BY g.id ASC, p.id ASC
      `).all();

      // Group by group_id
      const groupsMap = {};
      rows.forEach(row => {
        if (!groupsMap[row.group_id]) {
          groupsMap[row.group_id] = {
            id: row.group_id,
            name: row.group_name,
            pool: row.group_pool,
            players: []
          };
        }
        if (row.player_id) {
          const existingPlayer = groupsMap[row.group_id].players.find(p => p.name === row.player_name);
          if (!existingPlayer) {
            groupsMap[row.group_id].players.push({
              id: row.player_id,
              name: row.player_name
            });
          }
        }
      });

      return Response.json(Object.values(groupsMap));
    } else {
      // Return all groups with all players (grouped by cabor)
      const groups = db.prepare('SELECT * FROM groups ORDER BY id ASC').all();
      const players = db.prepare(`
        SELECT p.*, s.name as sport_name 
        FROM players p 
        JOIN sports s ON p.sport_id = s.id 
        ORDER BY p.group_id ASC, p.sport_id ASC, p.id ASC
      `).all();

      const result = groups.map(g => {
        const groupPlayers = players.filter(p => p.group_id === g.id);
        return {
          ...g,
          players: groupPlayers
        };
      });

      return Response.json(result);
    }
  } catch (error) {
    console.error('Error fetching groups:', error);
    return Response.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// POST: Add or update a player in a group for a sport
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('token');
    if (!tokenCookie || !verifyToken(tokenCookie.value)) {
      return Response.json({ error: 'Tidak terautorisasi' }, { status: 401 });
    }

    const { name, group_id, sport_id } = await request.json();
    if (!name || !group_id || !sport_id) {
      return Response.json(
        { error: 'Nama, group_id, dan sport_id wajib diisi' },
        { status: 400 }
      );
    }

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO players (name, group_id, sport_id) 
      VALUES (?, ?, ?)
    `).run(name, group_id, sport_id);

    return Response.json({
      success: true,
      message: 'Pemain berhasil ditambahkan',
      id: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Error adding player:', error);
    return Response.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
