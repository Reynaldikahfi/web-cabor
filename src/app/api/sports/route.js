import getDb from'@/lib/db';

export async function GET() {
 try {
 const db = getDb();
 const result = await db.execute('SELECT * FROM sports ORDER BY id ASC');
 const sports = result.rows;
 return Response.json(sports);
 } catch (error) {
 console.error('Error fetching sports:', error);
 return Response.json(
 { error:'Terjadi kesalahan pada server'},
 { status: 500 }
 );
 }
}
