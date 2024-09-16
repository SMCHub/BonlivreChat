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
    if (!Array.isArray(messages) || messages.length === 0 || !messages[0].role || !messages[0].content) {
      throw new Error('Ungültige Nachricht vom Client');
    }
    const message = messages[0]; // Wir verwenden nur die erste Nachricht
    const chatId = params.chatId;

    const chat = await prisma.chat.findUnique({
      where: { id: chatId, userId },
      include: { messages: true },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const allMessages = [...chat.messages, message];

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: allMessages.map(m => ({ role: m.role, content: m.content })),
    });

    const assistantMessage = completion.choices[0]?.message;

    if (!assistantMessage || !assistantMessage.role || !assistantMessage.content) {
      throw new Error('Ungültige Antwort von OpenAI');
    }

    const updatedChat = await prisma.chat.update({
      where: { id: chatId },
      data: {
        messages: {
          create: [
            message,
            { role: assistantMessage.role, content: assistantMessage.content },
          ],
        },
      },
      include: { messages: true },
    });

    return NextResponse.json(updatedChat);
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

  const prisma = new PrismaClient();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string };
    const userId = decoded.id;
    const chatId = params.chatId;

    // Überprüfen Sie zuerst, ob der Chat existiert und dem Benutzer gehört
    const chat = await prisma.chat.findUnique({
      where: { 
        id: chatId,
        userId: userId
      },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found or you are not authorized to delete it' }, { status: 404 });
    }

    // Löschen Sie zuerst alle zugehörigen Produkte
    await prisma.product.deleteMany({
      where: { chatId: chatId },
    });

    // Dann löschen Sie alle zugehörigen Nachrichten
    await prisma.message.deleteMany({
      where: { chatId: chatId },
    });

    // Schließlich löschen Sie den Chat selbst
    await prisma.chat.delete({
      where: { id: chatId },
    });

    return NextResponse.json({ message: 'Chat and associated messages and products deleted successfully' });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json({ error: 'Error deleting chat', details: (error as Error).message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(request: Request, { params }: { params: { chatId: string } }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const userId = decoded.id;

    const { message } = await request.json();
    const chatId = params.chatId;

    const chat = await prisma.chat.findUnique({
      where: { id: chatId, userId },
      include: { messages: true },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const updatedChat = await prisma.chat.update({
      where: { id: chatId },
      data: {
        messages: {
          create: [message],
        },
      },
      include: { messages: true },
    });

    return NextResponse.json(updatedChat);
  } catch (error) {
    console.error('Error updating chat:', error);
    return NextResponse.json({ error: 'Error updating chat', details: (error as Error).message }, { status: 500 });
  }
}