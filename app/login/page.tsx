"use client";

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from 'framer-motion';

export default function LoginPage() {
  console.log('LoginPage wird gerendert');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const validateInput = () => {
    if (!email || !password) {
      setError('Bitte füllen Sie alle Felder aus.');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
      return false;
    }
    if (password.length < 8) {
      setError('Das Passwort muss mindestens 8 Zeichen lang sein.');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInput()) return;

    const endpoint = isLogin ? '/api/login' : '/api/register';
    
    try {
      console.log('Sende Anfrage an:', endpoint);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ein Fehler ist aufgetreten');
      }

      setTokenWithExpiry(data.token);
      console.log('Anmeldung erfolgreich, leite weiter...');
      router.push('/');
    } catch (error) {
      console.error('Fehler bei der Anmeldung:', error);
      setError(error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten');
    }
  }, [email, password]);

  const setTokenWithExpiry = (token: string) => {
    const now = new Date();
    const expiryTime = now.getTime() + 55 * 60 * 1000; // 55 Minuten
    const item = {
      token: token,
      expiry: expiryTime,
    };
    localStorage.setItem('tokenData', JSON.stringify(item));
  };

  const getTokenWithExpiry = () => {
    const tokenString = localStorage.getItem('tokenData');
    if (!tokenString) {
      return null;
    }

    const tokenData = JSON.parse(tokenString);
    const now = new Date();

    if (now.getTime() > tokenData.expiry) {
      localStorage.removeItem('tokenData');
      return null;
    }

    return tokenData.token;
  };

  const refreshToken = async () => {
    const token = getTokenWithExpiry();
    if (token) {
      try {
        const response = await fetch('/api/refresh-token', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setTokenWithExpiry(data.token);
          console.log('Token erfolgreich aktualisiert');
        } else {
          throw new Error('Token konnte nicht aktualisiert werden');
        }
      } catch (error) {
        console.error('Fehler beim Aktualisieren des Tokens:', error);
        // Hier könnten Sie den Benutzer ausloggen oder zur Login-Seite weiterleiten
      }
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-900">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-lg shadow-xl w-96">
          <h2 className="text-2xl mb-6 text-white text-center">{isLogin ? 'Anmelden' : 'Registrieren'}</h2>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <Input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 mb-4 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
          <Input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 mb-6 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
          <Button
            type="submit"
            className="w-full p-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-300"
          >
            {isLogin ? 'Anmelden' : 'Registrieren'}
          </Button>
          <Button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="w-full p-3 mt-4 text-blue-400 hover:text-blue-300 transition duration-300"
          >
            {isLogin ? 'Zur Registrierung' : 'Zur Anmeldung'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
