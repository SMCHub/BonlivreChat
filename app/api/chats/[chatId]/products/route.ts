import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] });

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

    console.log(`Attempting to save products for chat ${chatId}`);

    if (!Array.isArray(products) || products.length === 0) {
      console.log('Invalid products data received');
      return NextResponse.json({ error: 'Invalid products data' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (prisma) => {
      const chat = await prisma.chat.findUnique({
        where: { id: chatId, userId },
      });

      if (!chat) {
        throw new Error('Chat not found');
      }

      await prisma.product.deleteMany({
        where: { chatId },
      });

      const createdProducts = await prisma.product.createMany({
        data: products.map((product: any) => ({
          id: product.id.toString(),
          name: product.name,
          price: product.price,
          description: product.short_description || null,
          permalink: product.permalink || null,
          imageUrl: product.images[0]?.src || null,
          categories: product.categories,
          chatId,
        })),
      });

      console.log(`${createdProducts.count} products saved`);

      return createdProducts;
    });

    return NextResponse.json({ success: true, productsCreated: result.count });
  } catch (error) {
    console.error('Error saving products:', error);
    return NextResponse.json({ error: 'Error saving products', details: (error as Error).message }, { status: 500 });
  }
}