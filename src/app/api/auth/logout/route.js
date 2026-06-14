import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('token');
    return Response.json({ success: true, message: 'Logout berhasil' });
  } catch (error) {
    console.error('Error logging out:', error);
    return Response.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('token');
    return Response.json({ success: true, message: 'Logout berhasil' });
  } catch (error) {
    console.error('Error logging out:', error);
    return Response.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
