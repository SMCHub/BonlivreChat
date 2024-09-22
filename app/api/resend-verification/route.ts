import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/emailService';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    if (user.isVerified) {
      return NextResponse.json({ error: 'Benutzer ist bereits verifiziert' }, { status: 400 });
    }

    const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET!, { expiresIn: '1d' });

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken }
    });

    await sendVerificationEmail(user.email, verificationToken);

    return NextResponse.json({ message: 'Verifizierungs-E-Mail wurde erneut gesendet' });
  } catch (error) {
    console.error('Fehler beim erneuten Senden der Verifizierungs-E-Mail:', error);
    return NextResponse.json({ error: 'Ein Fehler ist aufgetreten' }, { status: 500 });
  }
}
