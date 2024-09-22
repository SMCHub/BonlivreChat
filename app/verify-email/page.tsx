'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function VerifyEmail() {
  const [status, setStatus] = useState('Verifizierung läuft...');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isVerificationComplete, setIsVerificationComplete] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ? decodeURIComponent(searchParams.get('token')!) : null;

  useEffect(() => {
    if (token && !isVerificationComplete) {
      console.log('Versuche Token zu verifizieren:', token);
      fetch(`/api/verify-email?token=${token}`)
        .then(response => response.json())
        .then(data => {
          console.log('Verifizierungsantwort:', data);
          if (data.error) {
            throw new Error(data.error);
          }
          setStatus(data.message);
          setIsSuccess(true);
          setIsVerificationComplete(true);
          if (!data.alreadyVerified) {
            setTimeout(() => router.push('/login'), 3000);
          }
        })
        .catch(error => {
          console.error('Fehler bei der Verifizierung:', error);
          setStatus(`Verifizierung fehlgeschlagen: ${error.message}`);
          setIsSuccess(false);
          setIsVerificationComplete(true);
        });
    } else if (!token && !isVerificationComplete) {
      console.log('Kein Verifizierungstoken gefunden');
      setStatus('Kein Verifizierungstoken gefunden');
      setIsSuccess(false);
      setIsVerificationComplete(true);
    }
  }, [token, isVerificationComplete, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-4xl font-bold mb-4">E-Mail-Verifizierung</h1>
      <p className={`text-xl ${isSuccess ? 'text-green-500' : 'text-red-500'}`}>{status}</p>
      {isSuccess && !isVerificationComplete && <p className="mt-4">Sie werden in Kürze zur Login-Seite weitergeleitet...</p>}
    </div>
  );
}
