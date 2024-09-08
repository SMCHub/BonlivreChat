import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
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

    const chats = await prisma.chat.findMany({
      where: { userId },
      include: { messages: true },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(chats);
  } catch (error) {
    console.error('Detailed error:', error);
    return NextResponse.json({ error: 'Error fetching chats', details: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
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

    const chat = await prisma.chat.create({
      data: {
        userId,
        messages: {
          create: [],
        },
      },
      include: { messages: true },
    });
    return NextResponse.json(chat);
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json({ error: 'Error creating chat' }, { status: 500 });
  }
}
