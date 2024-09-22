import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';
import { handleError } from '@/lib/errorHandler';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    console.log('Login attempt for:', email);

    const user = await prisma.user.findUnique({ where: { email } });
    console.log('User found:', user ? 'Yes' : 'No');

    if (!user || !user.isVerified) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden oder E-Mail nicht verifiziert' }, { status: 404 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Passwort gültig:', isPasswordValid);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Ungültiges Passwort' }, { status: 401 });
    }

    if (!process.env.JWT_SECRET) {
      return handleError(new Error('JWT_SECRET is not set'), 'Interner Serverfehler');
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    console.log('Generated token:', token);

    return NextResponse.json({ token });
  } catch (error) {
    return handleError(error, 'Ein unerwarteter Fehler ist aufgetreten');
  } finally {
    await prisma.$disconnect();
  }
}
