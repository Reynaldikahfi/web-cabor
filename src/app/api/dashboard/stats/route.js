import getDb from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('token');
    if (!tokenCookie || !verifyToken(tokenCookie.value)) {
      return Response.json({ error: 'Tidak terautorisasi' }, { status: 401 });
    }

    const db = getDb();
    
    const [matchesRes, finishedRes, upcomingRes, playersRes, groupsRes, sportsRes] = await Promise.all([
      db.execute('SELECT COUNT(*) as count FROM matches'),
      db.execute("SELECT COUNT(*) as count FROM matches WHERE status = 'finished'"),
      db.execute("SELECT COUNT(*) as count FROM matches WHERE status = 'upcoming'"),
      db.execute('SELECT COUNT(DISTINCT name) as count FROM players'),
      db.execute('SELECT COUNT(*) as count FROM groups'),
      db.execute('SELECT COUNT(*) as count FROM sports'),
    ]);

    const totalMatches = matchesRes.rows[0].count;
    const finishedMatches = finishedRes.rows[0].count;
    const upcomingMatches = upcomingRes.rows[0].count;
    const totalPlayers = playersRes.rows[0].count;
    const totalGroups = groupsRes.rows[0].count;
    const totalSports = sportsRes.rows[0].count;

    return Response.json({
      totalMatches,
      finishedMatches,
      upcomingMatches,
      totalPlayers,
      totalGroups,
      totalSports
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return Response.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
