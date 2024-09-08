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

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages,
      });

      const assistantMessage = completion.choices[0].message;

      // Speichern Sie den Chat in der Datenbank
      await prisma.chat.create({
        data: {
          userId: userId,
          messages: {
            create: [
              ...messages,
              { role: assistantMessage.role, content: assistantMessage.content || '' },
            ],
          },
        },
      });

      return NextResponse.json({ message: assistantMessage });
    } catch (error) {
      console.error('Error:', error);
      return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}