"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { MessageSquare, Send, LogOut, PlusCircle, Trash, Menu, X } from "lucide-react"
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Chat {
  id: string;
  messages: Message[];
}

interface UserData {
  id: string;
  email: string;
}

export default function ChatPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingChats, setIsFetchingChats] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      router.push('/login');
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user]);

  const fetchChats = async () => {
    if (!user) return;
    setIsFetchingChats(true);
    try {
      const response = await fetch('/api/chats', {
        headers: {
          'Authorization': `Bearer ${user.id}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }
      const data = await response.json();
      setChats(data);
      if (data.length > 0 && !currentChat) {
        setCurrentChat(data[0]);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
      setError('Fehler beim Abrufen der Chats. Bitte versuchen Sie es später erneut.');
    } finally {
      setIsFetchingChats(false);
    }
  };

  const createNewChat = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify({ messages: [] }),
      });
      if (!response.ok) {
        throw new Error('Failed to create new chat');
      }
      const newChat = await response.json();
      setChats(prevChats => [newChat, ...prevChats]);
      setCurrentChat(newChat);
    } catch (error) {
      console.error('Error creating chat:', error);
      setError('Neuer Chat konnte nicht erstellt werden. Bitte versuchen Sie es später erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (input.trim() && !isLoading && currentChat && user) {
      setIsLoading(true);
      const newMessage = { role: "user", content: input.trim() };
      setInput("");

      try {
        const response = await fetch(`/api/chats/${currentChat.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.id}`
          },
          body: JSON.stringify({ message: newMessage }),
        });

        if (!response.ok) {
          throw new Error(response.statusText);
        }

        const updatedChat = await response.json();
        setCurrentChat(updatedChat);
        setChats(prevChats => prevChats.map(chat => 
          chat.id === updatedChat.id ? updatedChat : chat
        ));
      } catch (error) {
        console.error("Error:", error);
        setError('Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const deleteChat = async (chatId: string) => {
    if (!user) return;
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.id}`
        }
      });
      if (!response.ok) {
        throw new Error('Chat konnte nicht gelöscht werden');
      }
      setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
      if (currentChat?.id === chatId) {
        setCurrentChat(null);
      }
    } catch (error) {
      console.error('Fehler beim Löschen des Chats:', error);
      setError('Chat konnte nicht gelöscht werden. Bitte versuchen Sie es später erneut.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setChats([]);
    setCurrentChat(null);
    router.push('/login');
  };

  if (!user) {
    return null; // oder eine Lade-Animation
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar Toggle Button (nur auf mobilen Geräten sichtbar) */}
      <button
        className="md:hidden fixed top-4 right-4 z-20 bg-gray-800 p-2 rounded-full"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar für Chat-Verlauf */}
      <motion.div 
        initial={{ x: -300 }}
        animate={{ x: isSidebarOpen ? 0 : -300 }}
        className={`w-64 bg-gray-800 p-4 fixed md:static h-full z-10 ${
          isSidebarOpen ? 'block' : 'hidden md:block'
        }`}
      >
        <Button onClick={createNewChat} className="w-full mb-4 bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
          {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
          Neuer Chat
        </Button>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          {isFetchingChats ? (
            <div className="flex justify-center items-center h-full">
              <Spinner className="h-6 w-6" />
            </div>
          ) : (
            <AnimatePresence>
              {chats.map((chat) => (
                <motion.div 
                  key={chat.id} 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex mb-2"
                >
                  <Button
                    onClick={() => setCurrentChat(chat)}
                    className={`flex-grow justify-start ${currentChat?.id === chat.id ? 'bg-blue-600' : 'bg-gray-700'}`}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Chat {chat.id.slice(0, 6)}...
                  </Button>
                  <Button onClick={() => deleteChat(chat.id)} className="ml-2 bg-red-500 hover:bg-red-600">
                    <Trash className="h-4 w-4" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </ScrollArea>
      </motion.div>

      {/* Hauptchat-Bereich */}
      <div className="flex-1 flex flex-col w-full">
        {/* Chat-Header */}
        <header className="bg-gray-800 shadow p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">BonlivreChat</h1>
          <div className="flex items-center space-x-4">
            <span className="hidden md:inline">{user?.email}</span>
            <Button onClick={handleLogout} variant="ghost" className="text-sm py-1 px-2 hover:bg-gray-700">
              <LogOut className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">Abmelden</span>
            </Button>
          </div>
        </header>

        {/* Chat-Nachrichten */}
        <ScrollArea className="flex-1 p-4 bg-gray-900">
          <AnimatePresence>
            {currentChat && currentChat.messages ? (
              currentChat.messages.length > 0 ? (
                currentChat.messages.map((message, index) => (
                  <motion.div 
                    key={index} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`mb-8 ${message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}`}
                  >
                    <div className={`max-w-[70%] p-3 rounded-lg ${message.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                      {message.content}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center text-gray-500 mt-8">
                  Keine Nachrichten vorhanden. Starten Sie eine neue Unterhaltung!
                </div>
              )
            ) : (
              <div className="text-center text-gray-500 mt-8">
                Bitte wählen Sie einen Chat aus oder erstellen Sie einen neuen.
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>

        {/* Eingabebereich */}
        <div className="p-4 bg-gray-800 border-t border-gray-700">
          <div className="flex space-x-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Schreiben Sie eine Nachricht..."
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              className={`flex-1 bg-gray-700 text-white border-gray-600 ${!currentChat ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!currentChat}
            />
            <Button 
              onClick={handleSend} 
              disabled={isLoading || !currentChat} 
              className={`bg-blue-600 hover:bg-blue-700 ${!currentChat ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
