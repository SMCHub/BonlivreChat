import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Kein Token vorhanden' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET ist nicht gesetzt');
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string, email: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    
    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({ user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error('Fehler bei der Token-Überprüfung:', error);
    return NextResponse.json({ error: 'Ungültiger Token' }, { status: 401 });
  }
}
