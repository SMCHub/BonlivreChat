import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    console.log('Starting registration process');
    const { email, password } = await req.json();
    console.log('Received registration request for email:', email);

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      console.log('User already exists');
      return NextResponse.json({ error: 'E-Mail bereits registriert' }, { status: 400 });
    }

    console.log('Hashing password');
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('Creating new user in database');
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set');
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    console.log('Generating JWT token');
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('Registration successful');
    return NextResponse.json({ token });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ 
      error: 'Ein unerwarteter Fehler ist aufgetreten', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
