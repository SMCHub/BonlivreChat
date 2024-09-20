import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

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

    let chat;
    try {
      chat = await prisma.chat.findUnique({
        where: { id: chatId, userId },
        include: { messages: true },
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Database error', details: dbError instanceof Error ? dbError.message : String(dbError) }, { status: 500 });
    }

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
    const message = messages[0];
    const chatId = params.chatId;

    const chat = await prisma.chat.findUnique({
      where: { id: chatId, userId },
      include: { messages: true },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    let assistantMessage;

    if (message.content.toLowerCase().startsWith('/bonlivre bestellung:')) {
      const [, orderInfo] = message.content.split(':');
      const [orderNumber, postcode] = orderInfo.trim().split(' ');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/wordpress/order?orderNumber=${orderNumber}&postcode=${postcode}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const orderDetails = await response.json();
        assistantMessage = {
          role: 'assistant',
          content: `
            <div class="order-bubble">
              <h3>Bestelldetails</h3>
              <p>Bestellnummer: ${orderDetails.number}</p>
              <p>Status: ${orderDetails.status}</p>
              <p>Datum: ${new Date(orderDetails.date_created).toLocaleDateString()}</p>
              <p>Gesamtbetrag: ${orderDetails.total} ${orderDetails.currency}</p>
            </div>
          `
        };
      } else {
        assistantMessage = {
          role: 'assistant',
          content: `Es wurde keine Bestellung mit der Nummer "${orderNumber}" und der PLZ "${postcode}" gefunden. Bitte überprüfen Sie die eingegebenen Daten.`
        };
      }
    } else {
      const allMessages = [...chat.messages, message];
      allMessages.unshift({
        role: 'system',
        content: 'Du bist ein KI-Assistent, der auf dem GPT-4-Modell basiert. Wenn du nach deiner Identität oder Version gefragt wirst, antworte entsprechend.'
      });
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: allMessages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: 4000
      });
      assistantMessage = completion.choices[0]?.message;
    }

    if (!assistantMessage || !assistantMessage.role || !assistantMessage.content) {
      throw new Error('Ungültige Antwort');
    }

    const updatedChat = await prisma.chat.update({
      where: { id: chatId },
      data: {
        messages: {
          create: [
            { ...message, createdAt: new Date() },
            { role: assistantMessage.role, content: assistantMessage.content, createdAt: new Date() },
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