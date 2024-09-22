import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string, email: string };
    console.log('Token verified, decoded:', decoded);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, isVerified: true, verificationToken: true }
    });

    console.log('Full user data:', user);

    if (!user) {
      console.log('User not found');
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    const isBlacklisted = await prisma.blacklistedToken.findUnique({ where: { token } });
    if (isBlacklisted) {
      return NextResponse.json({ error: 'Token ist ungültig' }, { status: 401 });
    }

    console.log('User found, returning user data:', user);
    
    if (!user.isVerified) {
      console.log('Benutzer ist noch nicht verifiziert');
      return NextResponse.json({ user: { id: user.id, email: user.email, isVerified: user.isVerified }, message: 'E-Mail ist noch nicht verifiziert' }, { status: 200 });
    }

    return NextResponse.json({ user: { id: user.id, email: user.email, isVerified: user.isVerified } });
  } catch (error) {
    console.error('Fehler bei der Token-Überprüfung:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ error: 'Ungültiger Token', details: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Fehler bei der Token-Überprüfung', details: (error as Error).message }, { status: 500 });
  }
}
