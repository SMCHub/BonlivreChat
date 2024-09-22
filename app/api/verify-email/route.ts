import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendWelcomeEmail } from '@/lib/emailService';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  console.log('Empfangener Verifizierungstoken:', token);

  if (!token) {
    console.log('Kein Token bereitgestellt');
    return NextResponse.json({ error: 'Verifizierungstoken ist erforderlich' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { 
        verificationToken: token // Nur nach verificationToken suchen
      }
    });

    console.log('Benutzer gefunden:', user ? 'Ja' : 'Nein');

    if (!user) {
      // Überprüfen, ob ein Benutzer mit diesem Token bereits verifiziert wurde
      const verifiedUser = await prisma.user.findFirst({
        where: { 
          isVerified: true,
          verificationToken: null
        }
      });

      if (verifiedUser) {
        console.log('Benutzer wurde verifiziert:', verifiedUser.email);
        return NextResponse.json({ message: 'E-Mail wurde verifiziert', alreadyVerified: true });
      }

      console.log('Kein Benutzer mit Token gefunden:', token);
      return NextResponse.json({ error: 'Ungültiger Verifizierungstoken' }, { status: 400 });
    }

    if (user.isVerified) {
      console.log('Benutzer bereits verifiziert:', user.email);
      return NextResponse.json({ message: 'E-Mail bereits verifiziert', alreadyVerified: true });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, verificationToken: null }
    });

    console.log('Benutzer erfolgreich verifiziert:', user.email);

    // Sende Willkommens-E-Mail nach erfolgreicher Verifizierung
    try {
      await sendWelcomeEmail(user.email);
      console.log('Willkommens-E-Mail gesendet an:', user.email);
      return NextResponse.json({ message: 'E-Mail erfolgreich verifiziert und Willkommens-E-Mail gesendet' });
    } catch (emailError) {
      console.error('Fehler beim Senden der Willkommens-E-Mail:', emailError);
      return NextResponse.json({ message: 'E-Mail erfolgreich verifiziert, aber Fehler beim Senden der Willkommens-E-Mail' });
    }
  } catch (error) {
    console.error('Fehler bei der E-Mail-Verifizierung:', error);
    return NextResponse.json({ error: 'Ein Fehler ist aufgetreten', details: (error as Error).message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
