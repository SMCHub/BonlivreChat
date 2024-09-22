"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Mail, Key, ArrowLeft } from 'lucide-react';
import Image from 'next/image';

interface UserProfile {
  email: string;
  name: string;
  avatar: string;
  bio?: string;
  isVerified: boolean;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newAvatar, setNewAvatar] = useState<File | null>(null);
  const router = useRouter();
  const [currentChat, setCurrentChat] = useState(null);

  const loadChatHistory = () => {
    // Implementieren Sie hier die Logik zum Laden des Chat-Verlaufs
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

  const setTokenWithExpiry = (token: string) => {
    const now = new Date();
    const expiryTime = now.getTime() + 55 * 60 * 1000; // 55 Minuten
    const item = {
      token: token,
      expiry: expiryTime,
    };
    localStorage.setItem('tokenData', JSON.stringify(item));
  };

  const refreshTokenIfNeeded = async () => {
    const token = getTokenWithExpiry();
    if (token) {
      const tokenData = JSON.parse(localStorage.getItem('tokenData') || '{}');
      const now = new Date().getTime();
      const timeUntilExpiry = tokenData.expiry - now;
      
      if (timeUntilExpiry < 5 * 60 * 1000) {
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
          router.push('/login');
        }
      }
    }
  };

  const handleLogout = () => {
    // Implementieren Sie hier die Logout-Logik
  };

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const token = getTokenWithExpiry();
        if (!token) {
          router.push('/login');
          return;
        }

        const [profileResponse, tokenRefreshResponse] = await Promise.all([
          fetch('/api/profile', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }),
          refreshTokenIfNeeded()
        ]);

        if (!profileResponse.ok) {
          throw new Error('Failed to fetch profile');
        }

        const data = await profileResponse.json();
        setProfile({
          ...data,
          bio: data.bio || '',
          avatar: data.avatar || '/default-avatar.png'
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
        router.push('/login');
      }
    };

    fetchProfileData();
  }, [handleLogout, refreshTokenIfNeeded, router]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewAvatar(e.target.files[0]);
      const reader = new FileReader();
      reader.onload = () => {
        if (profile) {
          setProfile({ ...profile, avatar: reader.result as string });
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      await refreshTokenIfNeeded();
      const token = getTokenWithExpiry();
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          bio: profile.bio,
          avatar: profile.avatar
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      alert('Profil erfolgreich aktualisiert');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(`Fehler beim Aktualisieren des Profils: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  if (!profile) {
    return <div>Lade Profil...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <Button
          onClick={() => router.back()}
          variant="ghost"
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>
        
        <div className="relative">
          <div className="h-48 w-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
          <Image
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 h-32 w-32 rounded-full border-4 border-white shadow-lg"
            src={profile.avatar}
            alt={`Avatar von ${profile.name}`}
            width={128}
            height={128}
          />
          {isEditing && (
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 mt-2"
            />
          )}
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mt-16">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h1 className="text-3xl font-bold leading-tight text-gray-900">Profil</h1>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Name
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {isEditing ? (
                    <Input value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="max-w-md" />
                  ) : (
                    <span>{profile.name}</span>
                  )}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <Mail className="mr-2 h-5 w-5" />
                  E-Mail-Adresse
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {isEditing ? (
                    <Input value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} className="max-w-md" />
                  ) : (
                    <span>{profile.email}
                      {profile.isVerified ? (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Verifiziert
                        </span>
                      ) : (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Nicht verifiziert
                        </span>
                      )}
                    </span>
                  )}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <Key className="mr-2 h-5 w-5" />
                  Passwort ändern
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <Button variant="ghost">Passwort ändern</Button>
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Über mich</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {isEditing ? (
                    <textarea
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      rows={3}
                      placeholder="Erzählen Sie etwas über sich..."
                      value={profile.bio}
                      onChange={e => setProfile({...profile, bio: e.target.value})}
                    ></textarea>
                  ) : (
                    <p>{profile.bio || 'Keine Biografie vorhanden.'}</p>
                  )}
                </dd>
              </div>
            </dl>
          </div>
          <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
            {isEditing ? (
              <>
                <Button onClick={handleSave} className="ml-3">Änderungen speichern</Button>
                <Button onClick={() => setIsEditing(false)} variant="ghost" className="mr-3">Abbrechen</Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)} variant="ghost" className="mr-3">Bearbeiten</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
