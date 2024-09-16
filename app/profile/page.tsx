"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Mail, Key, ArrowLeft } from 'lucide-react';

interface UserProfile {
  email: string;
  name: string;
  avatar: string;
  bio?: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newAvatar, setNewAvatar] = useState<File | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('tokenData');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${JSON.parse(token).token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setProfile({
        ...data,
        bio: data.bio || '',
        avatar: data.avatar || '/default-avatar.png' // Standard-Avatar
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

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
      const token = localStorage.getItem('tokenData');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JSON.parse(token).token}`
        },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          bio: profile.bio,
          avatar: profile.avatar
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      alert('Profil erfolgreich aktualisiert');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Fehler beim Aktualisieren des Profils');
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
          <img
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 h-32 w-32 rounded-full border-4 border-white shadow-lg"
            src={profile.avatar}
            alt={`Avatar von ${profile.name}`}
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
                    <span>{profile.email}</span>
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
