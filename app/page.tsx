"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { MessageSquare, Send, LogOut, PlusCircle, Trash, Menu, X, Info } from "lucide-react"
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

interface Product {
  id: string;
  name: string;
  price: string;
  short_description: string;
  permalink: string;
  images: { src: string }[];
  categories: string[];
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
  const [fileRequest, setFileRequest] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<number>(-1);
  const [showTooltip, setShowTooltip] = useState(false);

  const router = useRouter();

  const commands = [
    "/Bonlivre Produkt:",
    "/Bonlivre Kategorie:"
  ];

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

  useEffect(() => {
    const token = getTokenWithExpiry();
    if (token) {
      fetch('/api/verify-token', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Token ungültig');
        }
        return response.json();
      })
      .then(data => {
        if (data.user) {
          console.log('Benutzer erfolgreich gesetzt:', data.user);
          setUser(data.user);
        } else {
          throw new Error('Kein Benutzer in den Daten gefunden');
        }
      })
      .catch(error => {
        console.error('Fehler bei der Token-Überprüfung:', error);
        localStorage.removeItem('tokenData');
        router.push('/login');
      });
    } else {
      console.log('Kein gültiger Token gefunden, leite zur Login-Seite weiter');
      router.push('/login');
    }
  }, []);

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
    try {
      const response = await fetch('/api/chats', {
        headers: {
          'Authorization': `Bearer ${getTokenWithExpiry()}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Fehler beim Abrufen der Chats: ${errorData.error}`);
      }
      const chatsData = await response.json();
      setChats(chatsData);
      if (chatsData.length > 0) {
        setCurrentChat(chatsData[0]);
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der Chats:', error);
      setError('Fehler beim Laden der Chats. Bitte versuchen Sie es später erneut.');
    }
  };

  const fetchWordPressProducts = async () => {
    try {
      const response = await fetch('/api/wordpress', {
        headers: {
          'Authorization': `Bearer ${getTokenWithExpiry()}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch WordPress products');
      }
      const data = await response.json();
      setProducts(data.products.map((product: any) => ({
        id: product.id,
        name: product.name,
        price: new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(product.price),
        short_description: product.short_description,
        permalink: product.permalink,
        images: product.images,
        categories: product.categories.map((cat: any) => cat.name)
      })));
    } catch (error) {
      console.error('Error fetching WordPress products:', error);
      setError('Fehler beim Abrufen der WordPress-Produkte. Bitte versuchen Sie es später erneut.');
    }
  };

  const createNewChat = async (newChat: Chat): Promise<Chat> => {
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getTokenWithExpiry()}`
        },
        body: JSON.stringify({ messages: newChat.messages }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Fehler beim Erstellen des neuen Chats: ${errorData.error}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Fehler beim Erstellen des neuen Chats:', error);
      throw error;
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
            setFileRequest(`[Bild hochgeladen: ${file.name}]\n\nBitte analysieren Sie dieses Bild und beschreiben Sie, was Sie sehen.`);
          } else {
            setFileRequest(`[Datei hochgeladen: ${file.name}]\n\nBitte analysieren Sie den Inhalt dieser Datei und geben Sie eine Zusammenfassung.`);
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
          'Authorization': `Bearer ${getTokenWithExpiry()}`
        },
        body: JSON.stringify({ message: newMessage }),
      });
      if (!response.ok) {
        throw new Error('Failed to update chat on server');
      }
    } catch (error) {
      console.error('Error updating chat on server:', error);
      setError('Fehler beim Aktualisieren des Chats. Bitte versuchen Sie es spter erneut.');
    }
  };

  const sendMessageAndUpdateChat = async (chatId: string, newMessage: Message) => {
    try {
      let messageContent = newMessage.content;
      if (fileRequest) {
        messageContent = `${fileRequest}\n\nDateiinhalt: ${uploadedFileContent}`;
      }

      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getTokenWithExpiry()}`
        },
        body: JSON.stringify({ messages: [{ ...newMessage, content: messageContent }] }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const updatedChat = await response.json();
      const assistantMessage = updatedChat.messages[updatedChat.messages.length - 1];

      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === chatId ? updatedChat : chat
        )
      );

      setCurrentChat(updatedChat);

      setFileRequest(null);
      setUploadedFileContent(null);
      setUploadedFileInfo(null);

      return assistantMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.');
      throw error;
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !fileRequest) return;
    if (!currentChat) {
      console.error('Kein aktueller Chat ausgewählt');
      return;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: fileRequest || input
    };

    setIsLoading(true);

    try {
      if (input.toLowerCase().startsWith('/bonlivre')) {
        setCurrentChat(prev => prev ? {
          ...prev,
          messages: [...prev.messages, newMessage]
        } : null);

        if (input.toLowerCase().startsWith('/bonlivre produkt:') ||
            input.toLowerCase().startsWith('/bonlivre kategorie:')) {
          const [command, searchTerm] = input.split(':');
          const searchType = command.split(' ')[1].toLowerCase();
          const foundProducts = await searchWordPressProducts(searchTerm.trim(), searchType);
          
          if (foundProducts.length > 0) {
            foundProducts.forEach(product => displayProduct(product));
          } else {
            const noProductsMessage: Message = {
              id: Date.now().toString(),
              role: 'assistant',
              content: `Es wurden keine Produkte für "${searchTerm.trim()}" gefunden. Bitte versuchen Sie es mit einem anderen Suchbegriff.`
            };
            setCurrentChat(prev => prev ? {
              ...prev,
              messages: [...prev.messages, noProductsMessage]
            } : null);
          }
        } else {
          // Unbekannter /bonlivre Befehl
          const unknownCommandMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `Unbekannter Befehl. Verfügbare Befehle sind: /bonlivre produkt:, /bonlivre kategorie:`
          };
          setCurrentChat(prev => prev ? {
            ...prev,
            messages: [...prev.messages, unknownCommandMessage]
          } : null);
        }
      } else {
        // Normale Nachricht
        await sendMessageAndUpdateChat(currentChat.id, newMessage);
      }
      setInput('');
      setFileRequest(null);
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
      setError('Fehler beim Senden der Nachricht. Bitte versuchen Sie es später erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChat = async (chatId: string) => {
    console.log('Versuche Chat zu löschen:', chatId);
    if (!user) {
      console.log('Kein Benutzer eingeloggt');
      return;
    }
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getTokenWithExpiry()}`
        }
      });
      console.log('Antwort vom Server:', response.status, response.statusText);
      if (!response.ok) {
        throw new Error('Chat konnte nicht gelöscht werden');
      }
      setChats(prevChats => {
        console.log('Aktualisiere Chats nach dem Löschen');
        return prevChats.filter(chat => chat.id !== chatId);
      });
      if (currentChat?.id === chatId) {
        console.log('Setze aktuellen Chat auf null');
        setCurrentChat(null);
      }
      console.log('Chat erfolgreich gelöscht');
    } catch (error) {
      console.error('Fehler beim Löschen des Chats:', error);
      setError('Chat konnte nicht gelöscht werden. Bitte versuchen Sie es später erneut.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tokenData');
    setUser(null);
    setChats([]);
    setCurrentChat(null);
    console.log('Benutzer ausgeloggt');
    router.push('/login');
  };

  const searchProducts = (query: string): Product[] => {
    const searchTerm = query.toLowerCase().replace('bonlivre produkt:', '').trim();
    return products.filter(product => 
      product.name.toLowerCase().includes(searchTerm) ||
      product.short_description.toLowerCase().includes(searchTerm)
    );
  };

  const displayProduct = (product: Product) => {
    const assistantMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `
        <div class="product-bubble">
          <a href="${product.permalink}" target="_blank">
            <img src="${product.images[0]?.src || '/placeholder-image.jpg'}" alt="${product.name}" class="product-image">
          </a>
          <h3>${product.name}</h3>
          <p>${product.price}</p>
          <p>Kategorien: ${product.categories.join(', ')}</p>
        </div>
      `
    };
    setCurrentChat(prev => prev ? {
      ...prev,
      messages: [...prev.messages, assistantMessage]
    } : null);
  };

  const searchWordPressProducts = async (searchTerm: string, searchType: string): Promise<Product[]> => {
    try {
      let url = `/api/wordpress?`;
      
      if (searchType === 'kategorie') {
        url += `category=${encodeURIComponent(searchTerm)}`;
      } else if (searchType === 'produkt') {
        url += `search=${encodeURIComponent(searchTerm)}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${getTokenWithExpiry()}`
        }
      });
      if (!response.ok) {
        throw new Error('Fehler beim Abrufen der WordPress-Produkte');
      }
      const data = await response.json();
      
      const products = data.products.map((product: any) => ({
        id: product.id,
        name: product.name,
        price: new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(product.price),
        short_description: product.short_description,
        permalink: product.permalink,
        images: product.images,
        categories: product.categories.map((cat: any) => cat.name)
      }));

      // Speichern Sie die gefundenen Produkte in der Datenbank
      if (currentChat) {
        await fetch(`/api/chats/${currentChat.id}/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getTokenWithExpiry()}`
          },
          body: JSON.stringify({ products })
        });
      }

      return products;
    } catch (error) {
      console.error('Fehler beim Abrufen der WordPress-Produkte:', error);
      return [];
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    console.log("Input value:", value);

    if (value.startsWith('/')) {
      const partialCommand = value.slice(1).toLowerCase();
      const matchingCommands = commands.filter(cmd => 
        cmd.toLowerCase().startsWith(partialCommand)
      );
      console.log("Matching commands:", matchingCommands);
      setSuggestions(matchingCommands);
    } else {
      setSuggestions([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length > 0) {
      if (e.key === 'Tab') {
        e.preventDefault();
        const newIndex = (selectedSuggestion + 1) % suggestions.length;
        setSelectedSuggestion(newIndex);
        setInput(suggestions[newIndex]);
      } else if (e.key === 'Enter' && selectedSuggestion !== -1) {
        e.preventDefault();
        setInput(suggestions[selectedSuggestion]);
        setSuggestions([]);
        setSelectedSuggestion(-1);
      }
    } else if (e.key === 'Enter') {
      handleSend();
    }
  };

  useEffect(() => {
    console.log("Suggestions updated:", suggestions);
  }, [suggestions]);

  const loadChatHistory = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        headers: {
          'Authorization': `Bearer ${getTokenWithExpiry()}`
        }
      });
      if (!response.ok) {
        throw new Error('Fehler beim Laden des Chat-Verlaufs');
      }
      const chatData = await response.json();
      setCurrentChat(chatData);
      if (chatData.products) {
        setProducts(chatData.products);
      }
    } catch (error) {
      console.error('Fehler beim Laden des Chat-Verlaufs:', error);
    }
  };

  useEffect(() => {
    if (currentChat) {
      loadChatHistory(currentChat.id);
    }
  }, [currentChat?.id]);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const response = await fetch('/api/chats', {
          headers: {
            'Authorization': `Bearer ${getTokenWithExpiry()}`
          }
        });
        if (!response.ok) {
          throw new Error('Fehler beim Abrufen der Chats');
        }
        const chatsData = await response.json();
        setChats(chatsData);
        if (chatsData.length > 0) {
          setCurrentChat(chatsData[0]); // Setze den ersten Chat als aktuellen Chat
        }
      } catch (error) {
        console.error('Fehler beim Abrufen der Chats:', error);
      }
    };

    fetchChats();
  }, []);

  const handleCreateNewChat = async () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      messages: []
    };

    try {
      const createdChat = await createNewChat(newChat);
      setCurrentChat(createdChat);
      setChats(prevChats => [createdChat, ...prevChats]);
    } catch (error) {
      console.error('Fehler beim Erstellen des neuen Chats:', error);
      setError('Neuer Chat konnte nicht erstellt werden. Bitte versuchen Sie es später erneut.');
    }
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
            <h1 className="text-xl font-bold md:text-center md:flex-grow">BonlivreChat.</h1>
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
            {/* Neuer Chat Button */}
            <div className="mb-4">
              <Button
                onClick={handleCreateNewChat}
                className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white"
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                Neuen Chat erstellen
              </Button>
            </div>

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
            <ScrollArea className="flex-1 p-4 bg-gray-900 h-[calc(100vh-8rem)]" ref={scrollAreaRef}>
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
                          <div 
                            className={`max-w-[70%] p-3 rounded-lg ${message.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'}`}
                            dangerouslySetInnerHTML={{ __html: message.content }}
                          />
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
              <div className="relative mb-2">
                <Input
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Schreiben Sie eine Nachricht..."
                  className="w-full bg-gray-700 text-white border-gray-600 pr-24"
                  disabled={!currentChat}
                />
                {suggestions.length > 0 && (
                  <div className="suggestions-container">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={suggestion}
                        className={`suggestion-item ${index === selectedSuggestion ? 'selected' : ''}`}
                        onClick={() => {
                          setInput(suggestion);
                          setSuggestions([]);
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-2">
                  <button
                    className="text-gray-400 hover:text-white focus:outline-none"
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    onClick={() => setShowTooltip(!showTooltip)}
                  >
                    <Info className="h-5 w-5" />
                  </button>
                  {showTooltip && (
                    <div className="tooltip">
                      <p className="font-bold mb-1">Verfügbare Befehle:</p>
                      <ul>
                        <li>/Bonlivre Produkt: [Suchbegriff]</li>
                        <li>/Bonlivre Kategorie: [Kategorie]</li>
                      </ul>
                    </div>
                  )}
                  <FileUpload 
                    onFileSelect={handleFileSelect} 
                    disabled={!currentChat || isLoading || fileRequest !== null}
                  />
                  <Button 
                    onClick={handleSend} 
                    disabled={isLoading || !currentChat} 
                    className="bg-blue-600 hover:bg-blue-700 p-1"
                  >
                    {isLoading ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
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
