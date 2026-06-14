import getDb from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const sports = db.prepare('SELECT * FROM sports ORDER BY id ASC').all();
    return Response.json(sports);
  } catch (error) {
    console.error('Error fetching sports:', error);
    return Response.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
