import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  console.log('Chats route called');
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Kein Token bereitgestellt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];
  console.log('Token received:', token);

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET ist nicht gesetzt');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }

  try {
    console.log('Versuche Token zu verifizieren');
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string };
    console.log('Token verifiziert, decoded:', decoded);
    const userId = decoded.id;

    // Chats aus der Datenbank holen
    const chats = await prisma.chat.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { content: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 20 // Begrenzen der Anzahl der zurückgegebenen Chats
    });

    return NextResponse.json(chats);
  } catch (error) {
    console.error('Detailed error:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ error: 'Ungültiger Token', details: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Ein unerwarteter Fehler ist aufgetreten' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: Request) {
  console.log('POST Chats route called');
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('No token provided');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string };
    const userId = decoded.id;

    const { title } = await request.json();

    const newChat = await prisma.chat.create({
      data: {
        userId,
        title: title || "Neuer Chat",
      },
    });

    console.log('New chat created:', newChat.id);
    return NextResponse.json(newChat);
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json({ error: 'Error creating chat', details: (error as Error).message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
