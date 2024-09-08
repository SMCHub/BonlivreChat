import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(request: Request, { params }: { params: { chatId: string } }) {
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

    const chatId = params.chatId;

    const chat = await prisma.chat.findUnique({
      where: { id: chatId, userId },
      include: { messages: true },
    });
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }
    return NextResponse.json(chat);
  } catch (error) {
    console.error('Error fetching chat:', error);
    return NextResponse.json({ error: 'Error fetching chat', details: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { chatId: string } }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const userId = decoded.id;

    const { messages } = await request.json();
    const chatId = params.chatId;

    const chat = await prisma.chat.findUnique({
      where: { id: chatId, userId },
      include: { messages: true },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const allMessages = [...chat.messages, ...messages];

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: allMessages.map(m => ({ role: m.role, content: m.content })),
    });

    const assistantMessage = completion.choices[0].message;

    const updatedChat = await prisma.chat.update({
      where: { id: chatId },
      data: {
        messages: {
          create: [
            ...messages,
            { role: assistantMessage.role, content: assistantMessage.content || '' },
          ],
        },
      },
      include: { messages: true },
    });

    return NextResponse.json({ chat: updatedChat, message: assistantMessage });
  } catch (error) {
    console.error('Error updating chat:', error);
    return NextResponse.json({ error: 'Error updating chat', details: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { chatId: string } }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string };
    userId = decoded.id;
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const chatId = params.chatId;

  try {
    const chat = await prisma.chat.findUnique({
      where: { 
        id: chatId,
        userId: userId
      },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found or you are not authorized to delete it' }, { status: 404 });
    }

    // Zuerst alle zugehörigen Nachrichten löschen
    await prisma.message.deleteMany({
      where: { chatId: chatId },
    });

    // Dann den Chat selbst löschen
    await prisma.chat.delete({
      where: { id: chatId },
    });

    return NextResponse.json({ message: 'Chat and associated messages deleted successfully' });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json({ error: 'Error deleting chat', details: (error as Error).message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}