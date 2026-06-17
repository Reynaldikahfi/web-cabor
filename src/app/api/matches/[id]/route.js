// PATH: src/app/api/matches/[id]/route.js
import getDb from'@/lib/db';
import { cookies } from'next/headers';
import { verifyToken } from'@/lib/auth';

// GET /api/matches/[id] — ambil satu pertandingan beserta detailnya
export async function GET(request, { params }) {
 try {
 const { id } = await params;
 const db = getDb();

 const matchResult = await db.execute({
 sql:`SELECT
 m.*,
 s.name AS sport_name,
 s.icon AS sport_icon,
 gh.name AS home_group_name,
 ga.name AS away_group_name
 FROM matches m
 JOIN sports s ON m.sport_id = s.id
 JOIN groups gh ON m.home_group_id = gh.id
 JOIN groups ga ON m.away_group_id = ga.id
 WHERE m.id = ?`,
 args: [parseInt(id)]
 });
 const match = matchResult.rows[0];

 if (!match) {
 return Response.json({ error:'Pertandingan tidak ditemukan'}, { status: 404 });
 }

 // Parse details JSON jika ada
 if (match.details && typeof match.details ==='string') {
 try { match.details = JSON.parse(match.details); } catch (e) { }
 }

 return Response.json(match);
 } catch (error) {
 console.error('Error fetching match:', error);
 return Response.json({ error:'Terjadi kesalahan pada server'}, { status: 500 });
 }
}

// PATCH /api/matches/[id] — update kolom details (gol & kartu)
export async function PATCH(request, { params }) {
 try {
 const cookieStore = await cookies();
 const tokenCookie = cookieStore.get('token');
 if (!tokenCookie || !verifyToken(tokenCookie.value)) {
 return Response.json({ error:'Tidak terautorisasi'}, { status: 401 });
 }

 const { id } = await params;
 const reqData = await request.json();
 const { details, home_score, away_score } = reqData;

 const db = getDb();

 const existingResult = await db.execute({ sql:'SELECT id FROM matches WHERE id = ?', args: [parseInt(id)] });
 const existing = existingResult.rows[0];
 if (!existing) {
 return Response.json({ error:'Pertandingan tidak ditemukan'}, { status: 404 });
 }

 if (details !== undefined) {
 const detailsStr = typeof details ==='string'? details : JSON.stringify(details);
 await db.execute({ sql:'UPDATE matches SET details = ? WHERE id = ?', args: [detailsStr, parseInt(id)] });
 }
 
 if (home_score !== undefined && away_score !== undefined) {
 const parsedHomeScore = (home_score !== null && home_score !=='') ? parseInt(home_score) : null;
 const parsedAwayScore = (away_score !== null && away_score !=='') ? parseInt(away_score) : null;
 await db.execute({ sql:'UPDATE matches SET home_score = ?, away_score = ? WHERE id = ?', args: [parsedHomeScore, parsedAwayScore, parseInt(id)] });
 }

 return Response.json({ success: true, message:'Detail pertandingan berhasil disimpan'});
 } catch (error) {
 console.error('Error updating match details:', error);
 return Response.json({ error:'Terjadi kesalahan pada server'}, { status: 500 });
 }
}

// PUT /api/matches/[id] — update data pertandingan (skor, jadwal, dll)
export async function PUT(request, { params }) {
 try {
 const cookieStore = await cookies();
 const tokenCookie = cookieStore.get('token');
 if (!tokenCookie || !verifyToken(tokenCookie.value)) {
 return Response.json({ error:'Tidak terautorisasi'}, { status: 401 });
 }

 const { id } = await params;
 const {
 sport_id,
 match_date,
 match_time,
 home_group_id,
 away_group_id,
 home_score,
 away_score,
 stage,
 status
 } = await request.json();

 if (!sport_id || !match_date || !home_group_id || !away_group_id || !status) {
 return Response.json(
 { error:'sport_id, match_date, home_group_id, away_group_id, dan status wajib diisi'},
 { status: 400 }
 );
 }

 const parsedHomeScore = (home_score !== null && home_score !== undefined && home_score !=='') ? parseInt(home_score) : null;
 const parsedAwayScore = (away_score !== null && away_score !== undefined && away_score !=='') ? parseInt(away_score) : null;

 const db = getDb();
 const result = await db.execute({
 sql:`UPDATE matches 
 SET sport_id = ?, match_date = ?, match_time = ?,
 home_group_id = ?, away_group_id = ?,
 home_score = ?, away_score = ?, stage = ?, status = ?
 WHERE id = ?`,
 args: [
 parseInt(sport_id), match_date, match_time,
 parseInt(home_group_id), parseInt(away_group_id),
 parsedHomeScore, parsedAwayScore,
 stage ||'group', status,
 parseInt(id)
 ]
 });

 if (result.rowsAffected === 0) {
 return Response.json({ error:'Pertandingan tidak ditemukan'}, { status: 404 });
 }

 return Response.json({ success: true, message:'Pertandingan berhasil diperbarui'});
 } catch (error) {
 console.error('Error updating match:', error);
 return Response.json({ error:'Terjadi kesalahan pada server'}, { status: 500 });
 }
}

// DELETE /api/matches/[id] — hapus pertandingan
export async function DELETE(request, { params }) {
 try {
 const cookieStore = await cookies();
 const tokenCookie = cookieStore.get('token');
 if (!tokenCookie || !verifyToken(tokenCookie.value)) {
 return Response.json({ error:'Tidak terautorisasi'}, { status: 401 });
 }

 const { id } = await params;
 const db = getDb();
 const result = await db.execute({ sql:'DELETE FROM matches WHERE id = ?', args: [parseInt(id)] });

 if (result.rowsAffected === 0) {
 return Response.json({ error:'Pertandingan tidak ditemukan'}, { status: 404 });
 }

 return Response.json({ success: true, message:'Pertandingan berhasil dihapus'});
 } catch (error) {
 console.error('Error deleting match:', error);
 return Response.json({ error:'Terjadi kesalahan pada server'}, { status: 500 });
 }
}
