import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: { chatId: string } }) {
  console.log("Upload-Route aufgerufen");
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    } catch (error) {
      console.error('JWT verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const userId = decoded.id;

    const chat = await prisma.chat.findUnique({
      where: { id: params.chatId, userId },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found or unauthorized' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 5 MB limit' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, and PDF are allowed' }, { status: 400 });
    }

    console.log("Datei erfolgreich empfangen:", file.name);

    // Hier würde die asynchrone Dateiverarbeitung stattfinden
    // z.B. Hochladen zu einem Cloud-Speicher oder Verarbeitung der Datei
    console.log("Datei wird verarbeitet:", file.name);

    // Simulieren Sie eine Verzögerung für die Verarbeitung
    await new Promise(resolve => setTimeout(resolve, 1000));

    return NextResponse.json({ fileName: file.name });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}