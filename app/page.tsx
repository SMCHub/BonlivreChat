"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { MessageSquare, Send, LogOut, PlusCircle, Trash, Menu, X } from "lucide-react"
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import jwt from 'jsonwebtoken';
import { FileUpload } from '@/components/ui/FileUpload';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<string | null>(null);
  const [uploadedFileContent, setUploadedFileContent] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/verify-token', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
        } else {
          router.push('/login');
        }
      })
      .catch(error => {
        console.error('Error verifying token:', error);
        router.push('/login');
      });
    } else {
      router.push('/login');
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [currentChat?.messages, isLoading]);

  const fetchChats = async () => {
    if (!user) return;
    setIsFetchingChats(true);
    try {
      const response = await fetch('/api/chats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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
      setError('Neuer Chat konnte nicht erstellt werden. Bitte versuchen Sie es spter erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    console.log("Datei ausgewählt:", file.name);
    setSelectedFile(file);
    if (currentChat) {
      try {
        console.log("Starte Datei-Upload");
        const uploadResult = await handleFileUpload(file);
        console.log("Upload-Ergebnis:", uploadResult);
        if (uploadResult) {
          const fileInfo = `Datei hochgeladen: ${file.name} (Typ: ${uploadResult.fileType}, Größe: ${(file.size / 1024).toFixed(2)} KB)`;
          setUploadedFileInfo(fileInfo);
          setUploadedFileContent(uploadResult.fileContent);
          
          if (uploadResult.fileType.startsWith('image/')) {
            setInput(`[Bild hochgeladen: ${file.name}]\n\nBildinhalt: ${uploadResult.fileContent}\n\nBitte analysieren Sie dieses Bild und beschreiben Sie, was Sie sehen.`);
          } else {
            setInput(`[Datei hochgeladen: ${file.name}]\n\nDateiinhalt: ${uploadResult.fileContent}\n\nBitte analysieren Sie den Inhalt dieser Datei und geben Sie eine Zusammenfassung.`);
          }
        }
      } catch (error) {
        console.error("Fehler beim Datei-Upload:", error);
        setError('Datei konnte nicht hochgeladen werden. Bitte versuchen Sie es später erneut.');
      } finally {
        setSelectedFile(null);
      }
    } else {
      console.log("Kein aktueller Chat ausgewählt");
      setError('Bitte wählen Sie zuerst einen Chat aus oder erstellen Sie einen neuen.');
    }
  };

  const handleFileUpload = async (file: File): Promise<{ fileName: string, fileContent: string, fileType: string } | null> => {
    console.log("handleFileUpload aufgerufen");
    if (!file || !currentChat) {
      console.log("Keine Datei oder kein Chat ausgewählt");
      return null;
    }

    const MAX_FILE_SIZE = 1024 * 1024; // 1 MB
    if (file.size > MAX_FILE_SIZE) {
      setError('Die Datei ist zu groß. Bitte wählen Sie eine Datei, die kleiner als 1 MB ist.');
      return null;
    }

    try {
      const fileContent = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const fileType = file.type;
      const fileName = file.name;

      return { fileName, fileContent, fileType };
    } catch (error) {
      console.error('Fehler beim Lesen der Datei:', error);
      setError('Datei konnte nicht gelesen werden. Bitte versuchen Sie es später erneut.');
      return null;
    }
  };

  const updateChatOnServer = async (chatId: string, newMessage: Message) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ message: newMessage }),
      });
      if (!response.ok) {
        throw new Error('Failed to update chat on server');
      }
    } catch (error) {
      console.error('Error updating chat on server:', error);
      setError('Fehler beim Aktualisieren des Chats. Bitte versuchen Sie es später erneut.');
    }
  };

  const sendMessageAndUpdateChat = async (chatId: string, newMessage: Message) => {
    try {
      // Zuerst die Benutzernachricht zum Chat hinzufügen
      setCurrentChat(prevChat => {
        if (prevChat && prevChat.id === chatId) {
          return {
            ...prevChat,
            messages: [...prevChat.messages, newMessage]
          };
        }
        return prevChat;
      });

      // Warten Sie einen Moment, damit die UI aktualisiert werden kann
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ messages: [newMessage] }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const { message: assistantMessage } = await response.json();

      // Dann die Assistentennachricht zum Chat hinzufügen
      setCurrentChat(prevChat => {
        if (prevChat && prevChat.id === chatId) {
          return {
            ...prevChat,
            messages: [...prevChat.messages, assistantMessage]
          };
        }
        return prevChat;
      });

      // Aktualisieren Sie auch den Chat in der Liste aller Chats
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === chatId 
            ? { ...chat, messages: [...chat.messages, newMessage, assistantMessage] } 
            : chat
        )
      );

      return assistantMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.');
      throw error;
    }
  };

  const handleSend = async () => {
    if (!currentChat || !input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setInput('');
    setIsLoading(true);

    try {
      await sendMessageAndUpdateChat(currentChat.id, userMessage);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChat = async (chatId: string) => {
    if (!user) return;
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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
    localStorage.removeItem('token');
    setUser(null);
    setChats([]);
    setCurrentChat(null);
    router.push('/login');
  };

  if (!user) {
    return null; // oder eine Lade-Animation
  }

  return (
    <>
      <div className="flex flex-col h-screen bg-gray-900 text-white">
        {/* Header */}
        <header className="bg-gray-800 shadow p-4 flex justify-between items-center relative">
          <div className="flex items-center w-full md:w-auto">
            <div className="w-12 md:w-16"></div>
            <h1 className="text-xl font-bold md:text-center md:flex-grow">BonlivreChat</h1>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <span>{user?.email}</span>
            <Button onClick={handleLogout} variant="ghost" className="text-sm py-1 px-2 hover:bg-gray-700">
              <LogOut className="h-4 w-4 mr-2" />
              <span>Abmelden</span>
            </Button>
          </div>
        </header>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <motion.div 
            initial={false}
            animate={{ x: isSidebarOpen ? 0 : -300 }}
            className={`w-64 bg-gray-800 p-4 absolute md:relative h-full z-10 ${
              isSidebarOpen ? 'block' : 'hidden md:block'
            }`}
          >
            <Button onClick={createNewChat} className="w-full mb-4 bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
              {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              Neuer Chat
            </Button>
            <ScrollArea className="h-[calc(100vh-12rem)]">
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
            <div className="md:hidden mt-4">
              <Button onClick={handleLogout} variant="ghost" className="w-full text-sm py-2 px-4 hover:bg-gray-700">
                <LogOut className="h-4 w-4 mr-2" />
                <span>Abmelden ({user?.email})</span>
              </Button>
            </div>
          </motion.div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col w-full">
            <ScrollArea className="flex-1 p-4 bg-gray-900 h-full" ref={scrollAreaRef}>
              <AnimatePresence>
                {currentChat && currentChat.messages ? (
                  currentChat.messages.length > 0 ? (
                    currentChat.messages.map((message, index) => (
                      message && message.role ? (
                        <motion.div 
                          key={index} 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className={`mb-8 ${message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}`}
                        >
                          <div className={`max-w-[70%] p-3 rounded-lg ${message.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                            {message.content && message.content.startsWith('Datei hochgeladen:') ? (
                              <div>
                                <p>{message.content.split('(')[0]}</p>
                                <p className="text-sm text-gray-300">{message.content.split('(')[1].replace(')', '')}</p>
                              </div>
                            ) : (
                              message.content
                            )}
                          </div>
                        </motion.div>
                      ) : null
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
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex justify-center items-center my-4"
                >
                  <Spinner className="h-8 w-8" />
                </motion.div>
              )}
            </ScrollArea>

            {/* Input area */}
            <div className="p-4 bg-gray-800 border-t border-gray-700">
              {uploadedFileInfo && (
                <div className="mb-2 p-2 bg-gray-700 rounded-md flex items-center justify-between">
                  <span className="text-sm text-gray-300 truncate">{uploadedFileInfo}</span>
                  <Button
                    onClick={() => setUploadedFileInfo(null)}
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-gray-200"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex space-x-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Schreiben Sie eine Nachricht..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  className={`flex-1 bg-gray-700 text-white border-gray-600 ${!currentChat ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!currentChat}
                />
                <FileUpload onFileSelect={handleFileSelect} disabled={!currentChat || isLoading} />
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
      </div>

      {/* Sidebar Toggle Button */}
      <button
        className="sidebar-toggle fixed top-4 left-2 md:left-4 bg-gray-800 p-2 rounded-full z-50 md:absolute"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>
    </>
  );
}
