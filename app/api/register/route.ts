import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { sendWelcomeEmail } from '@/lib/emailService';

export async function POST(req: Request) {
  try {
    console.log('Starting registration process');
    const { email, password } = await req.json();
    console.log('Received registration request for email:', email);

    // Validierung
    if (!email || !password) {
      return NextResponse.json({ error: 'E-Mail und Passwort sind erforderlich' }, { status: 400 });
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: 'Ungültige E-Mail-Adresse' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Das Passwort muss mindestens 8 Zeichen lang sein' }, { status: 400 });
    }

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

    // Senden der Willkommens-E-Mail
    await sendWelcomeEmail(user.email);

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
