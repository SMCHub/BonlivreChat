import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function POST(request: Request, { params }: { params: { chatId: string } }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const userId = decoded.id;

    const { products } = await request.json();
    const chatId = params.chatId;

    const chat = await prisma.chat.findUnique({
      where: { id: chatId, userId },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    await prisma.product.deleteMany({
      where: { chatId },
    });

    await prisma.product.createMany({
      data: products.map((product: any) => ({
        ...product,
        chatId,
      })),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving products:', error);
    return NextResponse.json({ error: 'Error saving products' }, { status: 500 });
  }
}