import { NextResponse } from 'next/server';

export function handleError(error: unknown, defaultMessage: string) {
  console.error('Fehler:', error);
  const errorMessage = error instanceof Error ? error.message : defaultMessage;
  return NextResponse.json({ error: errorMessage }, { status: 500 });
}
