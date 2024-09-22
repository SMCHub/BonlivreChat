import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// Einfacher In-Memory-Cache (für Produktionsumgebungen sollten Sie einen verteilten Cache wie Redis verwenden)
const cache = new Map();

const CACHE_EXPIRY = 5 * 60 * 1000; // 5 Minuten

export async function GET(request: Request) {
  console.log('Profile API aufgerufen um:', new Date().toISOString());
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const userId = decoded.id;

    const cachedUser = cache.get(userId);
    if (cachedUser && Date.now() - cachedUser.timestamp < CACHE_EXPIRY) {
      return NextResponse.json(cachedUser.data);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        name: true, 
        email: true, 
        bio: true, 
        avatar: true,
        isVerified: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    // Nur cachen, wenn der Benutzer verifiziert ist
    if (user.isVerified) {
      cache.set(userId, { data: user, timestamp: Date.now() });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Fehler beim Abrufen des Profils:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ error: 'Ungültiger Token' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Ein unerwarteter Fehler ist aufgetreten' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const userId = decoded.id;

    const { name, email, bio, avatar } = await request.json();

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name, email, bio, avatar },
      select: { name: true, email: true, bio: true, avatar: true }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
