import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Fügen Sie diese Zeile hinzu
prisma.$connect().then(() => console.log('Prisma connected')).catch(e => console.error('Prisma connection error:', e));

interface Product {
  name: string;
  price: string;
}

export async function POST(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const userId = decoded.id;

    const { messages, products } = await req.json();

    // Genauere Token-Schätzung
    const estimateTokens = (text: string) => {
      return Math.ceil(text.length / 2.5);
    };

    let totalTokens = 0;
    const reducedMessages = [];
    const MAX_TOKENS = 12000;

    for (let i = messages.length - 1; i >= 0; i--) {
      const messageTokens = estimateTokens(JSON.stringify(messages[i]));
      if (totalTokens + messageTokens > MAX_TOKENS) break;
      totalTokens += messageTokens;
      reducedMessages.unshift(messages[i]);
    }

    console.log(`Geschätzte Token-Anzahl: ${totalTokens}`);

    // Fügen Sie Produktinformationen zur Nachricht hinzu, nur wenn Produkte gefunden wurden
    if (products && products.length > 0) {
      const productInfo = (products as Product[]).map(p => `${p.name} (${p.price})`).join(', ');
      reducedMessages.push({
        role: 'system',
        content: `Folgende Produkte wurden gefunden: ${productInfo}. Bitte empfehle in deiner Antwort diese spezifischen Produkte dem Benutzer und gib eine kurze Beschreibung zu jedem Buch.`
      });
    } else if (messages[messages.length - 1].content.toLowerCase().startsWith('bonlivre produkt:')) {
      reducedMessages.push({
        role: 'system',
        content: 'Es wurden keine spezifischen Produkte für diese Anfrage gefunden. Bitte informiere den Benutzer darüber und schlage vor, die Suche zu verfeinern oder nach anderen Produkten zu suchen.'
      });
    }

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k",
        messages: reducedMessages,
        max_tokens: 2000
      });

      const assistantMessage = completion.choices[0].message;

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
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}