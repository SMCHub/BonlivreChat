import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  console.log('Verify-token route called');
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('No token provided');
    return NextResponse.json({ error: 'Kein Token vorhanden' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  console.log('Token received:', token);

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET ist nicht gesetzt');
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }

  try {
    await prisma.$connect();
    console.log('Database connection successful');

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string, email: string };
    console.log('Token verified, decoded:', decoded);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true }
    });
    
    if (!user) {
      console.log('User not found');
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    console.log('User found, returning user data');
    return NextResponse.json({ user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error('Fehler bei der Token-Überprüfung:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ error: 'Ungültiger Token', details: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Fehler bei der Token-Überprüfung', details: (error as Error).message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
