import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization');
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
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error verifying token:', error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
