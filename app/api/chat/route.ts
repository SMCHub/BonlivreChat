import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const userId = decoded.id;

    const { messages } = await req.json();

    // Genauere Token-Schätzung
    const estimateTokens = (text: string) => {
      return Math.ceil(text.length / 2.5); // Noch konservativere Schätzung
    };

    // Reduzieren Sie die Nachrichten, bis sie unter dem Limit liegen
    let totalTokens = 0;
    const reducedMessages = [];
    const MAX_TOKENS = 12000; // Noch konservativerer Sicherheitspuffer für 16k Modell

    for (let i = messages.length - 1; i >= 0; i--) {
      const messageTokens = estimateTokens(JSON.stringify(messages[i]));
      if (totalTokens + messageTokens > MAX_TOKENS) break;
      totalTokens += messageTokens;
      reducedMessages.unshift(messages[i]);
    }

    console.log(`Geschätzte Token-Anzahl: ${totalTokens}`);

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k",
        messages: reducedMessages,
        max_tokens: 2000
      });

      const assistantMessage = completion.choices[0].message;

      // Speichern Sie nur die letzten Nachrichten in der Datenbank
      const lastMessages = [...reducedMessages.slice(-2), { role: assistantMessage.role, content: assistantMessage.content || '' }];

      const newChat = await prisma.chat.create({
        data: {
          userId: userId,
          messages: {
            create: lastMessages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
          },
        },
      });

      return NextResponse.json({ message: assistantMessage, chatId: newChat.id });
    } catch (error) {
      console.error('Error:', error);
      return NextResponse.json({ error: 'An error occurred', details: (error as any).message }, { status: 500 });
    }
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'An error occurred', details: (error as any).message }, { status: 500 });
  }
}