import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Fügen Sie diese Funktion hinzu
async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('Database connection successful');
  } catch (error) {
    console.error('Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Rufen Sie diese Funktion auf, wenn der Server startet
testDatabaseConnection();

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
    await prisma.$connect();
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
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }

  try {
    await prisma.$connect();
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string };
    const userId = decoded.id;

    const { messages } = await request.json();

    const newChat = await prisma.chat.create({
      data: {
        userId,
        messages: {
          create: messages
        }
      },
      include: { messages: true }
    });

    return NextResponse.json(newChat);
  } catch (error) {
    console.error('Detailed error:', error);
    return NextResponse.json({ error: 'Error creating chat', details: (error as Error).message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
