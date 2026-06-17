import { cookies } from'next/headers';
import { verifyToken } from'@/lib/auth';

export async function GET() {
 try {
 const cookieStore = await cookies();
 const tokenCookie = cookieStore.get('token');
 
 if (!tokenCookie) {
 return Response.json({ authenticated: false }, { status: 200 });
 }

 const decoded = verifyToken(tokenCookie.value);
 if (!decoded) {
 return Response.json({ authenticated: false }, { status: 200 });
 }

 return Response.json({
 authenticated: true,
 admin: {
 id: decoded.id,
 username: decoded.username
 }
 });
 } catch (error) {
 console.error('Error checking session:', error);
 return Response.json(
 { error:'Terjadi kesalahan pada server'},
 { status: 500 }
 );
 }
}
