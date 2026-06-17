import getDb from'@/lib/db';
import { verifyToken, comparePassword, hashPassword } from'@/lib/auth';
import { cookies } from'next/headers';

export async function PUT(request) {
 try {
 const cookieStore = await cookies();
 const tokenCookie = cookieStore.get('token');
 
 if (!tokenCookie) {
 return Response.json({ error:'Tidak terautorisasi'}, { status: 401 });
 }

 const decoded = verifyToken(tokenCookie.value);
 if (!decoded) {
 return Response.json({ error:'Sesi tidak valid'}, { status: 401 });
 }

 const { oldPassword, newUsername, newPassword } = await request.json();

 if (!oldPassword || !newUsername || !newPassword) {
 return Response.json({ error:'Semua field wajib diisi'}, { status: 400 });
 }

 const db = getDb();
 const adminResult = await db.execute({
 sql:'SELECT * FROM admins WHERE id = ?',
 args: [decoded.id]
 });
 const admin = adminResult.rows[0];

 if (!admin) {
 return Response.json({ error:'Admin tidak ditemukan'}, { status: 404 });
 }

 if (!comparePassword(oldPassword, admin.password_hash)) {
 return Response.json({ error:'Password lama salah'}, { status: 401 });
 }

 const newPasswordHash = await hashPassword(newPassword);

 try {
 await db.execute({
 sql:'UPDATE admins SET username = ?, password_hash = ? WHERE id = ?',
 args: [newUsername, newPasswordHash, decoded.id]
 });
 } catch (e) {
 if (e.message.includes('UNIQUE constraint failed')) {
 return Response.json({ error:'Username sudah digunakan'}, { status: 400 });
 }
 throw e;
 }

 return Response.json({ success: true, message:'Akun berhasil diperbarui'});
 } catch (error) {
 console.error('Error updating admin account:', error);
 return Response.json({ error:'Terjadi kesalahan pada server'}, { status: 500 });
 }
}
