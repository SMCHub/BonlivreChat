import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(request: Request, { params }: { params: { chatId: string } }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = authHeader.split(' ')[1];

  const chatId = params.chatId;

  try {
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
    return NextResponse.json({ error: 'Error fetching chat' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { chatId: string } }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = authHeader.split(' ')[1];

  const chatId = params.chatId;
  const { message } = await request.json();

  try {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId, userId },
      include: { messages: true },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const updatedMessages = [...chat.messages, message];

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
    });

    const assistantMessage = completion.choices[0].message;

    const updatedChat = await prisma.chat.update({
      where: { id: chatId },
      data: {
        messages: {
          create: [
            message,
            { role: assistantMessage.role, content: assistantMessage.content || '' },
          ],
        },
      },
      include: { messages: true },
    });

    return NextResponse.json(updatedChat);
  } catch (error) {
    console.error('Error updating chat:', error);
    return NextResponse.json({ error: 'Error updating chat' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { chatId: string } }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = authHeader.split(' ')[1];

  const chatId = params.chatId;

  try {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId, userId },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found or unauthorized' }, { status: 404 });
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