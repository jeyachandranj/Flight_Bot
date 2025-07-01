import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';

const CodemagenChatbot = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: "👋 Hello! I'm Codemagen's AI assistant. I can help you learn about our travel-tech solutions, booking engines, and services. What would you like to know?",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiInput, setShowApiInput] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Airport codes mapping
  const AIRPORT_CODES = {
    'chennai': 'MAA',
    'mumbai': 'BOM', 
    'bangalore': 'BLR',
    'delhi': 'DEL',
    'kolkata': 'CCU',
    'hyderabad': 'HYD',
    'pune': 'PNQ',
    'ahmedabad': 'AMD',
    'goa': 'GOI',
    'kochi': 'COK',
    'jaipur': 'JAI',
    'lucknow': 'LKO',
    'indore': 'IDR',
    'bhubaneswar': 'BBI',
    'coimbatore': 'CJB',
    'madurai': 'IXM',
    'trivandrum': 'TRV',
    'calicut': 'CCJ',
    'vijayawada': 'VGA',
    'tirupati': 'TIR',
    'nashik': 'ISK',
    'udaipur': 'UDR',
    'salem': 'SXV',
    'selam': 'SXV'
  };

  const generateFlightSearchURL = (origin, destination, travelDate, passengers = 1, classType = 'ECONOMY') => {
    const originCode = AIRPORT_CODES[origin.toLowerCase()] || origin.toUpperCase();
    const destCode = AIRPORT_CODES[destination.toLowerCase()] || destination.toUpperCase();
    
    return `https://www.codemagen.net/flights/oneway?adult_count=${passengers}&child_count=0&class_type=${classType}&destination=${destCode}&destinationCountry=IN&host_search=false&infant_count=0&non_stop=false&origin=${originCode}&originCountry=IN&search_type=one_way&travel_date=${travelDate}`;
  };

  const formatDateToStandard = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateForURL = (date) => {
    return date.toISOString().split('T')[0];
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  };

  const getNextWeekMonday = () => {
    const today = new Date();
    const daysUntilNextMonday = (1 + 7 - today.getDay()) % 7 || 7;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilNextMonday);
    return nextMonday;
  };

  const parseCustomDate = (dateStr) => {
    const currentYear = new Date().getFullYear();
    
    // Handle formats like 7/8/25, 07/08/25, 7/8/2025
    const slashFormats = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/,
      /^(\d{1,2})-(\d{1,2})-(\d{2,4})$/
    ];
    
    for (const format of slashFormats) {
      const match = dateStr.match(format);
      if (match) {
        let day = parseInt(match[1]);
        let month = parseInt(match[2]) - 1; // JS months are 0-indexed
        let year = parseInt(match[3]);
        
        // Handle 2-digit years
        if (year < 100) {
          year += year < 50 ? 2000 : 1900;
        }
        
        return new Date(year, month, day);
      }
    }
    
    // Handle formats like 7/jul/25, 7/july/2025
    const monthNameFormats = [
      /^(\d{1,2})\/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\/(\d{2,4})$/i,
      /^(\d{1,2})\/(january|february|march|april|may|june|july|august|september|october|november|december)\/(\d{2,4})$/i
    ];
    
    const monthMap = {
      'jan': 0, 'january': 0, 'feb': 1, 'february': 1, 'mar': 2, 'march': 2,
      'apr': 3, 'april': 3, 'may': 4, 'jun': 5, 'june': 5,
      'jul': 6, 'july': 6, 'aug': 7, 'august': 7, 'sep': 8, 'september': 8,
      'oct': 9, 'october': 9, 'nov': 10, 'november': 10, 'dec': 11, 'december': 11
    };
    
    for (const format of monthNameFormats) {
      const match = dateStr.match(format);
      if (match) {
        let day = parseInt(match[1]);
        let month = monthMap[match[2].toLowerCase()];
        let year = parseInt(match[3]);
        
        if (year < 100) {
          year += year < 50 ? 2000 : 1900;
        }
        
        return new Date(year, month, day);
      }
    }
    
    return null;
  };

  const getDateFromText = (text) => {
    const lowerText = text.toLowerCase();
    
    // Handle "tomorrow" or "tommorow"
    if (lowerText.includes('tomorrow') || lowerText.includes('tommorow')) {
      return getTomorrowDate();
    }
    
    // Handle "next week monday"
    if (lowerText.includes('next week') && lowerText.includes('monday')) {
      return getNextWeekMonday();
    }
    
    // Handle specific date formats
    const dateFormats = [
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/g,
      /(\d{1,2}-\d{1,2}-\d{2,4})/g,
      /(\d{1,2}\/(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\/\d{2,4})/gi,
      /(\d{1,2}\/(?:january|february|march|april|may|june|july|august|september|october|november|december)\/\d{2,4})/gi
    ];
    
    for (const format of dateFormats) {
      const matches = [...text.matchAll(format)];
      if (matches.length > 0) {
        const parsedDate = parseCustomDate(matches[0][1]);
        if (parsedDate && !isNaN(parsedDate)) {
          return parsedDate;
        }
      }
    }
    
    // Handle simple patterns like "6 jul", "july 6", etc.
    const simplePatterns = [
      /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
      /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i,
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})/i,
      /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i
    ];
    
    const monthMap = {
      'jan': 0, 'january': 0, 'feb': 1, 'february': 1, 'mar': 2, 'march': 2,
      'apr': 3, 'april': 3, 'may': 4, 'jun': 5, 'june': 5,
      'jul': 6, 'july': 6, 'aug': 7, 'august': 7, 'sep': 8, 'september': 8,
      'oct': 9, 'october': 9, 'nov': 10, 'november': 10, 'dec': 11, 'december': 11
    };
    
    for (const pattern of simplePatterns) {
      const match = text.match(pattern);
      if (match) {
        let day, month;
        if (match[1] && isNaN(match[1])) {
          month = monthMap[match[1].toLowerCase()];
          day = parseInt(match[2]);
        } else {
          day = parseInt(match[1]);
          month = monthMap[match[2].toLowerCase()];
        }
        
        if (month !== undefined && day >= 1 && day <= 31) {
          const currentYear = new Date().getFullYear();
          const date = new Date(currentYear, month, day);
          if (date < new Date()) {
            date.setFullYear(currentYear + 1);
          }
          return date;
        }
      }
    }
    
    return getTomorrowDate(); // Default to tomorrow
  };

  const checkAccountPageRequest = (message) => {
    const lowerMessage = message.toLowerCase();
    
    // Check for booking related requests
    const bookingKeywords = ['booking', 'bookings', 'my booking', 'my bookings', 'booking page'];
    if (bookingKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return {
        type: 'booking',
        url: 'https://www.codemagen.net/myaccounts/bookings',
        displayText: 'My Bookings'
      };
    }
    
    // Check for account/statement related requests
    const accountKeywords = ['account', 'accounts', 'statement', 'account page', 'statement page'];
    if (accountKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return {
        type: 'account',
        url: 'https://www.codemagen.net/myaccounts/accounts',
        displayText: 'Account Statement'
      };
    }
    
    // Check for profile related requests
    const profileKeywords = ['profile', 'my profile', 'profile page'];
    if (profileKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return {
        type: 'profile',
        url: 'https://www.codemagen.net/myaccounts/profile',
        displayText: 'My Profile'
      };
    }
    
    return null;
  };

  const extractFlightSearchInfo = (message) => {
    const lowerMessage = message.toLowerCase();
    let origin = '', destination = '', travelDate = null;
    
    // Extract cities
    const cities = Object.keys(AIRPORT_CODES);
    const foundCities = cities.filter(city => lowerMessage.includes(city));
    
    // Common patterns for origin-destination
    const patterns = [
      /(?:from\s+)?(\w+)\s+to\s+(\w+)/i,
      /(\w+)\s+to\s+(\w+)/i,
      /(\w+)\s*-\s*(\w+)/i
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const city1 = match[1].toLowerCase();
        const city2 = match[2].toLowerCase();
        
        if (cities.includes(city1) && cities.includes(city2)) {
          origin = city1;
          destination = city2;
          break;
        }
      }
    }
    
    // If no pattern match, use found cities in order
    if (!origin && !destination && foundCities.length >= 2) {
      origin = foundCities[0];
      destination = foundCities[1];
    }
    
    // Extract travel date
    travelDate = getDateFromText(message);
    
    return { origin, destination, travelDate };
  };

  const CODEMAGEN_CONTEXT = `You are an AI assistant for Codemagen Technologies Private Limited, a travel-tech company. Here's important information about the company:

COMPANY OVERVIEW:
- Full Name: Codemagen Technologies Private Limited
- Incorporated: January 4, 2024 in Mumbai, Maharashtra
- Industry: Travel technology solutions provider
- Headquarters: Mumbai with presence in Bangalore
- Team Size: 1-10 employees (as of early 2025)
- Paid-up Capital: ₹100,000
- Status: Active, privately held Indian company
- NIC Code: 7912 (Travel agency/tour operator technology)

FOUNDERS & LEADERSHIP:
- Sufail Zakir Husain – Director & Co-founder
- Kishanvir – Director & Co-founder
- Both appointed on incorporation date: January 4, 2024

PRODUCTS & SERVICES:
1. Advanced Booking Engines:
   - Tailored specifically for travel companies
   - Optimized for conversion and user experience
   - Designed for hotels, airlines, resorts, and travel businesses

2. Dynamic Revenue & Inventory Management:
   - Real-time pricing optimization
   - Availability management systems
   - Revenue maximization tools

3. Custom Travel CRMs:
   - Guest interaction management
   - Streamlined operations for travel businesses
   - Industry-specific features

FLIGHT SEARCH CAPABILITY:
You can help users search for flights using Codemagen's flight booking system. When users ask about flights, extract the origin, destination, and travel date from their message, then provide a direct link to search results. The system supports various date formats and natural language inputs.

ACCOUNT PAGE NAVIGATION:
You can help users navigate to different account pages:
- Booking/My Bookings: https://www.codemagen.net/myaccounts/bookings
- Account/Statement: https://www.codemagen.net/myaccounts/accounts  
- Profile: https://www.codemagen.net/myaccounts/profile

UNIQUE VALUE PROPOSITION:
- Industry-specific innovation focused on travel sector nuances
- Custom solutions rather than generic platforms
- Technology designed specifically for travel business requirements
- Expertise in hotels, airlines, resorts, and travel-related businesses

TARGET CUSTOMERS:
- Hotels and resorts
- Airlines
- Travel agencies
- Tour operators
- Travel-related businesses

LOCATIONS:
- Primary: Mumbai, Maharashtra
- Secondary: Bangalore, Karnataka

Always respond in a helpful, professional manner representing Codemagen. When users ask about flight searches, help them find flights and provide direct booking links. For other topics, focus on how our travel-tech solutions can benefit potential clients.`;

  const callGroqAPI = async (userMessage) => {
    if (!apiKey) {
      throw new Error('Please enter your Groq API key first');
    }

    // Check if this is an account page request
    const accountPageRequest = checkAccountPageRequest(userMessage);
    if (accountPageRequest) {
      const { type, url, displayText } = accountPageRequest;
      let emoji = '📋';
      let description = '';
      
      switch (type) {
        case 'booking':
          emoji = '✈️';
          description = 'View and manage all your flight bookings, hotel reservations, and travel itineraries in one place.';
          break;
        case 'account':
          emoji = '💳';
          description = 'Check your account balance, transaction history, and payment statements.';
          break;
        case 'profile':
          emoji = '👤';
          description = 'Update your personal information, travel preferences, and account settings.';
          break;
      }
      
      return `${emoji} **${displayText}**\n\n${description}\n\n[🔗 Go to ${displayText}](${url})\n\nClick the link above to access your ${displayText.toLowerCase()} page. You'll need to sign in to your Codemagen account if you haven't already.\n\nNeed help with anything else? I can assist with flight searches, hotel bookings, or answer questions about Codemagen's services!`;
    }

    // Check if this is a flight search request
    const flightKeywords = ['flight', 'flights', 'fly', 'travel', 'book', 'search', 'list'];
    const containsFlightKeyword = flightKeywords.some(keyword => 
      userMessage.toLowerCase().includes(keyword)
    );
    
    const { origin, destination, travelDate } = extractFlightSearchInfo(userMessage);
    
    if (containsFlightKeyword && origin && destination && travelDate) {
      const urlDate = formatDateForURL(travelDate);
      const displayDate = formatDateToStandard(travelDate);
      const flightURL = generateFlightSearchURL(origin, destination, urlDate);
      const shortURL = `codemagen.net/flights → ${AIRPORT_CODES[origin]} to ${AIRPORT_CODES[destination]}`;
      
      return `🛫 **Flight Search Results**\n\n**Route:** ${origin.charAt(0).toUpperCase() + origin.slice(1)} (${AIRPORT_CODES[origin]}) → ${destination.charAt(0).toUpperCase() + destination.slice(1)} (${AIRPORT_CODES[destination]})\n**Travel Date:** ${displayDate}\n**Class:** Economy\n**Passengers:** 1 Adult\n\n[✈️ Search Available Flights: ${shortURL}](${flightURL})\n\nClick the link above to view all available flights for your selected route and date. You can modify passengers, class type, and other preferences on the search page.\n\nNeed help with return flights, hotels, or have questions about Codemagen's services?`;
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: CODEMAGEN_CONTEXT
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    if (!apiKey && showApiInput) {
      alert('Please enter your Groq API key first');
      return;
    }

    const newUserMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const botResponse = await callGroqAPI(inputMessage);
      
      const newBotMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: botResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, newBotMessage]);
    } catch (error) {
      console.error('Error calling Groq API:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: `Sorry, I encountered an error: ${error.message}. Please check your API key and try again.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleApiKeySubmit = () => {
    if (apiKey.trim()) {
      setShowApiInput(false);
    }
  };

  if (showApiInput) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Codemagen AI Assistant</h2>
            <p className="text-gray-600">Enter your Groq API key to get started</p>
          </div>
          
          <div className="space-y-4">
            <input
              type="password"
              placeholder="Enter your Groq API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleApiKeySubmit()}
            />
            <button
              onClick={handleApiKeySubmit}
              disabled={!apiKey.trim()}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Start Chat
            </button>
          </div>
          
          <div className="mt-6 text-sm text-gray-500">
            <p className="mb-2">🔒 Your API key is stored locally and never sent to our servers.</p>
            <p>Get your free Groq API key at: <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">console.groq.com</a></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center">
              <Bot size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Codemagen AI Assistant</h1>
              <p className="text-sm text-gray-600">Travel-Tech Solutions Expert</p>
            </div>
          </div>
          <button
            onClick={() => setShowApiInput(true)}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Change API Key
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex items-start space-x-3 max-w-3xl ${
                  message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-600 text-white'
                  }`}
                >
                  {message.type === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div
                  className={`px-4 py-3 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-800 shadow-sm border'
                  }`}
                >
                  <div 
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                      __html: message.content
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline font-medium">$1</a>')
                    }}
                  />
                  <div
                    className={`text-xs mt-2 ${
                      message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3 max-w-3xl">
                <div className="w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot size={16} />
                </div>
                <div className="bg-white text-gray-800 px-4 py-3 rounded-lg shadow-sm border">
                  <div className="flex items-center space-x-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex space-x-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about Codemagen's travel-tech solutions..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodemagenChatbot;