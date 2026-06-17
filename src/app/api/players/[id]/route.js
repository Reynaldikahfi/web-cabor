// PATH: src/app/api/players/[id]/route.js
import getDb from'@/lib/db';
import { cookies } from'next/headers';
import { verifyToken } from'@/lib/auth';

// PUT — update nama pemain di SEMUA cabor sekaligus
export async function PUT(request, { params }) {
 try {
 const cookieStore = await cookies();
 const tokenCookie = cookieStore.get('token');
 if (!tokenCookie || !verifyToken(tokenCookie.value)) {
 return Response.json({ error:'Tidak terautorisasi'}, { status: 401 });
 }

 const { id } = await params;
 const { name } = await request.json();

 if (!name) {
 return Response.json({ error:'Nama pemain wajib diisi'}, { status: 400 });
 }

 const db = getDb();

 // Cari pemain berdasarkan id untuk dapat name & group_id lama
 const existingResult = await db.execute({
 sql:'SELECT name, group_id FROM players WHERE id = ?',
 args: [parseInt(id)]
 });
 const existing = existingResult.rows[0];
 if (!existing) {
 return Response.json({ error:'Pemain tidak ditemukan'}, { status: 404 });
 }

 // Update semua record dengan name & group_id yang sama (semua cabor)
 const result = await db.execute({
 sql:'UPDATE players SET name = ? WHERE name = ? AND group_id = ?',
 args: [name.trim(), existing.name, existing.group_id]
 });

 return Response.json({
 success: true,
 message:`Nama pemain berhasil diperbarui di ${result.rowsAffected} cabang olahraga`,
 });
 } catch (error) {
 console.error('Error updating player:', error);
 return Response.json({ error:'Terjadi kesalahan pada server'}, { status: 500 });
 }
}

// DELETE — hapus pemain dari SEMUA cabor sekaligus
export async function DELETE(request, { params }) {
 try {
 const cookieStore = await cookies();
 const tokenCookie = cookieStore.get('token');
 if (!tokenCookie || !verifyToken(tokenCookie.value)) {
 return Response.json({ error:'Tidak terautorisasi'}, { status: 401 });
 }

 const { id } = await params;
 const db = getDb();

 // Cari pemain berdasarkan id untuk dapat name & group_id
 const existingResult = await db.execute({
 sql:'SELECT name, group_id FROM players WHERE id = ?',
 args: [parseInt(id)]
 });
 const existing = existingResult.rows[0];
 if (!existing) {
 return Response.json({ error:'Pemain tidak ditemukan'}, { status: 404 });
 }

 // Hapus semua record dengan name & group_id yang sama (semua cabor)
 const result = await db.execute({
 sql:'DELETE FROM players WHERE name = ? AND group_id = ?',
 args: [existing.name, existing.group_id]
 });

 return Response.json({
 success: true,
 message:`Pemain berhasil dihapus dari ${result.rowsAffected} cabang olahraga`,
 });
 } catch (error) {
 console.error('Error deleting player:', error);
 return Response.json({ error:'Terjadi kesalahan pada server'}, { status: 500 });
 }
}
