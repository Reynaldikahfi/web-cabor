import getDb from'@/lib/db';
import { cookies } from'next/headers';
import { verifyToken } from'@/lib/auth';

export async function GET(request) {
 try {
 const { searchParams } = new URL(request.url);
 const sportId = searchParams.get('sport_id');
 const status = searchParams.get('status');

 const db = getDb();
 
 let query =`SELECT 
 m.id, 
 m.sport_id, 
 m.match_date, 
 m.match_time, 
 m.home_group_id, 
 m.away_group_id, 
 m.home_score, 
 m.away_score, 
 m.stage, 
 m.status,
 m.details,
 s.name AS sport_name, 
 s.icon AS sport_icon,
 gh.name AS home_group_name, 
 ga.name AS away_group_name
 FROM matches m
 JOIN sports s ON m.sport_id = s.id
 JOIN groups gh ON m.home_group_id = gh.id
 JOIN groups ga ON m.away_group_id = ga.id`;
 
 const params = [];
 const conditions = [];

 if (sportId) {
 conditions.push(`m.sport_id = ?`);
 params.push(parseInt(sportId));
 }

 if (status) {
 conditions.push(`m.status = ?`);
 params.push(status);
 }

 if (conditions.length > 0) {
 query += ` WHERE ` + conditions.join(' AND ');
 }

 query += ` ORDER BY m.match_date ASC, m.match_time ASC, m.id ASC`;

 const matchesResult = await db.execute({ sql: query, args: params });
 const matches = matchesResult.rows;
 
 // Parse the details JSON if it exists
 const parsedMatches = matches.map(match => {
 if (match.details) {
 try {
 match.details = JSON.parse(match.details);
 } catch (e) {
 console.error("Failed to parse match details JSON", e);
 }
 }
 return match;
 });

 return Response.json(parsedMatches);
 } catch (error) {
 console.error('Error fetching matches:', error);
 return Response.json(
 { error:'Terjadi kesalahan pada server'},
 { status: 500 }
 );
 }
}

export async function POST(request) {
 try {
 const cookieStore = await cookies();
 const tokenCookie = cookieStore.get('token');
 if (!tokenCookie || !verifyToken(tokenCookie.value)) {
 return Response.json({ error:'Tidak terautorisasi'}, { status: 401 });
 }

 const {
 sport_id,
 match_date,
 match_time,
 home_group_id,
 away_group_id,
 stage ='group',
 status ='upcoming',
 home_score = null,
 away_score = null
 } = await request.json();

 if (!sport_id || !match_date || !home_group_id || !away_group_id) {
 return Response.json(
 { error:'sport_id, match_date, home_group_id, dan away_group_id wajib diisi'},
 { status: 400 }
 );
 }

 if (parseInt(home_group_id) === parseInt(away_group_id)) {
 return Response.json(
 { error:'Grup kandang dan tandang tidak boleh sama'},
 { status: 400 }
 );
 }

 const db = getDb();
 const result = await db.execute({
 sql:`INSERT INTO matches (sport_id, match_date, match_time, home_group_id, away_group_id, home_score, away_score, stage, status)
 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
 args: [
 parseInt(sport_id),
 match_date,
 match_time,
 parseInt(home_group_id),
 parseInt(away_group_id),
 home_score !== null && home_score !==''? parseInt(home_score) : null,
 away_score !== null && away_score !==''? parseInt(away_score) : null,
 stage,
 status
 ]
 });

 return Response.json({
 success: true,
 message:'Pertandingan berhasil ditambahkan',
 matchId: Number(result.lastInsertRowid)
 });
 } catch (error) {
 console.error('Error creating match:', error);
 return Response.json(
 { error:'Terjadi kesalahan pada server'},
 { status: 500 }
 );
 }
}
