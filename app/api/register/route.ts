import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/emailService'; // Stellen Sie sicher, dass diese Funktion korrekt importiert ist
import bcrypt from 'bcrypt';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // Passwort hashen
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generiere ein Verifizierungs-Token
    const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET!, { expiresIn: '1d' });

    console.time('Benutzer erstellen');
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        verificationToken,
      },
    });
    console.timeEnd('Benutzer erstellen');
    console.log('Benutzer erstellt:', user.id);
    console.log('Generated verification token:', verificationToken);

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET ist nicht gesetzt');
      return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    try {
      await sendVerificationEmail(user.email, verificationToken);
      console.log('Verification email sent successfully to:', user.email);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Detailliertes Logging des Fehlers
      if (emailError instanceof Error) {
        console.error('Error name:', emailError.name);
        console.error('Error message:', emailError.message);
        console.error('Error stack:', emailError.stack);
      }
      // Informiere den Benutzer über den Fehler beim E-Mail-Versand
      return NextResponse.json({ 
        token, 
        message: 'Registrierung erfolgreich, aber die Verifizierungs-E-Mail konnte nicht gesendet werden. Bitte kontaktieren Sie den Support.',
        error: 'E-Mail-Versand fehlgeschlagen'
      }, { status: 200 });
    }

    // Erfolgreiche Registrierung
    return NextResponse.json({ 
      token, 
      message: 'Registrierung erfolgreich. Bitte überprüfen Sie Ihre E-Mail zur Verifizierung.' 
    }, { status: 201 });
  } catch (error) {
    console.error('Fehler bei der Registrierung:', error);
    return NextResponse.json({ 
      error: 'Registrierung fehlgeschlagen', 
      details: (error as Error).message 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
