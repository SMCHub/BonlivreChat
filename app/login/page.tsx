"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from 'framer-motion';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/login' : '/api/register';
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        router.push('/');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Ein Fehler ist aufgetreten');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
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
