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
    
    const totalMatches = db.prepare('SELECT COUNT(*) as count FROM matches').get().count;
    const finishedMatches = db.prepare("SELECT COUNT(*) as count FROM matches WHERE status = 'finished'").get().count;
    const upcomingMatches = db.prepare("SELECT COUNT(*) as count FROM matches WHERE status = 'upcoming'").get().count;
    const totalPlayers = db.prepare('SELECT COUNT(DISTINCT name) as count FROM players').get().count;
    const totalGroups = db.prepare('SELECT COUNT(*) as count FROM groups').get().count;
    const totalSports = db.prepare('SELECT COUNT(*) as count FROM sports').get().count;

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
