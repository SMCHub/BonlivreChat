"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { MessageSquare, Send, LogOut, PlusCircle, Trash, X, Info, Moon, Sun, User } from "lucide-react"
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import jwt from 'jsonwebtoken';
import { FileUpload } from '@/components/ui/FileUpload';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ClipboardIcon } from 'lucide-react';

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
  const [showCopiedTooltip, setShowCopiedTooltip] = useState(false);

  const router = useRouter();

  const commands = [
    "/Bonlivre Produkt:",
    "/Bonlivre Kategorie:",
    "/Bonlivre Bestellung:"
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
      
      // Aktualisiere Token, wenn weniger als 5 Minuten übrig sind
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
          handleLogout();
        }
      }
    }
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
          refreshTokenIfNeeded();
        } else {
          throw new Error('Kein Benutzer in den Daten gefunden');
        }
      })
      .catch(error => {
        console.error('Fehler bei der Token-Überprüfung:', error);
        if (error.message === 'Datenbankverbindung fehlgeschlagen') {
          setError('Es gibt ein Problem mit der Datenbankverbindung. Bitte versuchen Sie es später erneut.');
        } else if (error.message === 'Ungültiger Token') {
          handleLogout();
        } else {
          setError('Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
        }
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
      })))
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
          console.log(`Suche nach ${searchType}: ${searchTerm.trim()}`);
          const foundProducts = await searchWordPressProducts(searchTerm.trim(), searchType);
          
          console.log(`Gefundene Produkte: ${foundProducts.length}`);
          
          if (foundProducts.length > 0) {
            foundProducts.forEach(product => {
              console.log(`Zeige Produkt an: ${product.name}`);
              displayProduct(product);
            });
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
        } else if (input.toLowerCase().startsWith('/bonlivre bestellung:')) {
          const [, orderInfo] = input.split(':');
          const [orderNumber, postcode] = orderInfo.trim().split(' ');
          
          if (!orderNumber || !postcode) {
            const errorMessage: Message = {
              id: Date.now().toString(),
              role: 'assistant',
              content: 'Bitte geben Sie sowohl die Bestellnummer als auch die Postleitzahl an.'
            };
            setCurrentChat(prev => prev ? {
              ...prev,
              messages: [...prev.messages, errorMessage]
            } : null);
            return;
          }

          const orderDetails = await fetchOrderDetails(orderNumber, postcode);

          if (orderDetails.error) {
            let errorContent = orderDetails.error;
            if (orderDetails.orderPostcode && orderDetails.requestPostcode) {
              errorContent += ` Die Postleitzahl in der Bestellung (${orderDetails.orderPostcode}) stimmt nicht mit der angegebenen Postleitzahl (${orderDetails.requestPostcode}) überein.`;
            }
            const errorMessage: Message = {
              id: Date.now().toString(),
              role: 'assistant',
              content: errorContent
            };
            setCurrentChat(prev => prev ? {
              ...prev,
              messages: [...prev.messages, errorMessage]
            } : null);
          } else {
            displayOrderDetails(orderDetails);
          }
        } else {
          // Unbekannter /bonlivre Befehl
          const unknownCommandMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `Unbekannter Befehl. Verfügbare Befehle sind: /bonlivre produkt:, /bonlivre kategorie:, /bonlivre bestellung:`
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

  const fetchOrderDetails = async (orderNumber: string, postcode: string): Promise<any> => {
    try {
      const response = await fetch(`/api/wordpress/order?orderNumber=${orderNumber}&postcode=${postcode}`, {
        headers: {
          'Authorization': `Bearer ${getTokenWithExpiry()}`
        }
      });
      const data = await response.json();
      if (data.error) {
        if (data.orderPostcode && data.requestPostcode) {
          return {
            error: `${data.error} Die Postleitzahl in der Bestellung (${data.orderPostcode}) stimmt nicht mit der angegebenen Postleitzahl (${data.requestPostcode}) überein.`
          };
        }
        return { error: data.error };
      }
      return data;
    } catch (error) {
      console.error('Fehler beim Abrufen der Bestelldetails:', error);
      return { error: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.' };
    }
  };

  const displayOrderDetails = (orderDetails: any) => {
    if (orderDetails.error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: orderDetails.error
      };
      setCurrentChat(prev => prev ? {
        ...prev,
        messages: [...prev.messages, errorMessage]
      } : null);
      return;
    }

    let statusMessage = '';
    switch (orderDetails.status) {
      case 'completed':
        statusMessage = 'Ihre Bestellung wurde erfolgreich abgeschlossen und per A-Post versendet. Sie sollte in Kürze bei Ihnen eintreffen. Wir hoffen, Sie werden viel Freude an Ihren neuen Büchern haben!';
        break;
      case 'processing':
        statusMessage = 'Ihre Bestellung wird derzeit von unserem engagierten Team bearbeitet. Wir setzen alles daran, sie so schnell wie möglich für den Versand vorzubereiten.';
        break;
      case 'on-hold':
        statusMessage = 'Ihre Bestellung befindet sich aktuell in Wartestellung. Wir erwarten die Lieferung in unserem Logistikzentrum und werden sie umgehend bearbeiten, sobald sie eingetroffen ist.';
        break;
      default:
        statusMessage = `Status: ${orderDetails.status}`;
    }

    const orderMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `
        <div class="order-bubble">
          <h3>Bestelldetails</h3>
          <p>Bestellnummer: ${orderDetails.number}</p>
          <p>${statusMessage}</p>
          <p>Datum: ${new Date(orderDetails.date_created).toLocaleDateString()}</p>
          <p>Gesamtbetrag: ${orderDetails.total} ${orderDetails.currency}</p>
          <h4>Bestellte Produkte:</h4>
          <ul>
            ${orderDetails.line_items.map((item: any) => `
              <li>${item.name} - Menge: ${item.quantity}, Preis: ${item.total} ${orderDetails.currency}</li>
            `).join('')}
          </ul>
        </div>
      `
    };
    setCurrentChat(prev => prev ? {
      ...prev,
      messages: [...prev.messages, orderMessage]
    } : null);
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
      if (chatData.products && chatData.products.length > 0) {
        setProducts(chatData.products);
      } else {
        setProducts([]); // Leere das Produkt-Array, wenn keine Produkte vorhanden sind
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

  const toggleSidebar = () => {
    console.log('Sidebar Toggle wurde geklickt');
    setIsSidebarOpen(!isSidebarOpen);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setShowCopiedTooltip(true);
    setTimeout(() => setShowCopiedTooltip(false), 2000);
  };

  if (!user) {
    return null; // oder eine Lade-Animation
  }

  return (
    <>
      <div className="flex flex-col h-screen bg-white">
        {/* Header */}
        <header className="shadow-md p-4 flex items-center justify-between relative bg-white z-50">
          <div className="flex items-center">
            {/* Burger-Icon für Sidebar */}
            <button
              className="p-2 mr-2 rounded-full text-gray-800 hover:bg-gray-200 transition-colors duration-200 block"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            {/* Logo */}
            <h1 className="text-2xl font-bold text-accent-color">BonlivreChat.</h1>
          </div>

          {/* Profil und Abmelden Icons */}
          <div className="flex items-center space-x-2">
            <Button onClick={() => router.push('/profile')} variant="ghost" className="p-2 text-text-primary hover:bg-background-secondary rounded-full">
              <User className="h-5 w-5" />
            </Button>
            <Button onClick={handleLogout} variant="ghost" className="p-2 text-text-primary hover:bg-background-secondary rounded-full">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <motion.div 
            initial={false}
            animate={{ x: isSidebarOpen ? 0 : -300 }}
            className={`w-64 p-4 absolute md:relative h-full z-10 bg-gray-100 text-gray-800 ${
              isSidebarOpen ? 'block' : 'hidden md:block'
            }`}
          >
            <div className="mb-4">
              <Button
                onClick={handleCreateNewChat}
                className="w-full flex items-center justify-center bg-gray-200 hover:bg-gray-300 transition-colors duration-200"
              >
                <PlusCircle className="w-5 h-5 mr-2 text-gray-600" />
                <span className="text-gray-800">Neuen Chat erstellen</span>
              </Button>
            </div>

            <ScrollArea className="h-[calc(100vh-12rem)]">
              {isFetchingChats ? (
                <div className="flex justify-center items-center h-full">
                  <Spinner className="h-6 w-6 text-accent-color" />
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
                        className={`flex-grow justify-start transition-colors duration-200 ${
                          currentChat?.id === chat.id 
                            ? 'bg-gray-200 text-text-primary'
                            : 'bg-background-secondary text-text-primary hover:bg-gray-100'
                        }`}
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Chat {chat.id.slice(0, 6)}...
                      </Button>
                      <Button onClick={() => deleteChat(chat.id)} className="ml-2 bg-error-color hover:bg-opacity-80 transition-colors duration-200">
                        <Trash className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </ScrollArea>
            <div className="md:hidden mt-4 bg-gray-100 p-4 rounded-lg shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="h-6 w-6 text-gray-600" />
                  <span className="text-sm text-gray-700">{user?.email}</span>
                </div>
                <Button onClick={handleLogout} variant="ghost" className="text-sm py-1 px-2 hover:bg-gray-200 transition-colors duration-200">
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>Abmelden</span>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col w-full bg-white">
            <ScrollArea className="flex-1 p-4 h-[calc(100vh-8rem)]" ref={scrollAreaRef}>
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
                            className={`max-w-[70%] p-3 rounded-lg ${
                              message.role === 'user' 
                                ? 'bg-gray-200 text-gray-800' 
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {message.content.startsWith('/Bonlivre') ? (
                              <span className="text-gray-800">{message.content}</span>
                            ) : (
                              <div 
                                className="prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: message.content }}
                              />
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
            <div className="p-4 bg-gray-100">
              <div className="relative mb-2">
                <Input
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Schreiben Sie eine Nachricht..."
                  className="w-full pr-24 rounded-lg border-none shadow-md transition-all duration-300 focus:ring-2 focus:ring-accent-color bg-white text-gray-800"
                  disabled={!currentChat}
                />
                {suggestions.length > 0 && (
                  <div className="suggestions-container bg-gray-700 border border-gray-600 rounded-lg shadow-lg text-sm">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={suggestion}
                        className={`suggestion-item p-1.5 hover:bg-gray-600 cursor-pointer transition-colors duration-200 ${
                          index === selectedSuggestion ? 'bg-gray-600 text-white' : 'text-white'
                        }`}
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
                    className="text-text-tertiary hover:text-text-secondary focus:outline-none transition-colors duration-200"
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    onClick={() => setShowTooltip(!showTooltip)}
                  >
                    <Info className="h-5 w-5" />
                  </button>
                  {showTooltip && (
                    <div className="tooltip bg-background-secondary text-text-primary p-2 rounded-lg shadow-md text-xs">
                      <p className="font-bold mb-1">Verfügbare Befehle:</p>
                      <ul>
                        <li>/Bonlivre Produkt: [Suchbegriff]</li>
                        <li>/Bonlivre Kategorie: [Kategorie]</li>
                        <li>/Bonlivre Bestellung: [Bestellnummer] [PLZ]</li>
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
                    className="bg-accent-color hover:bg-link-hover-color p-1 transition-colors duration-200"
                  >
                    {isLoading ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
