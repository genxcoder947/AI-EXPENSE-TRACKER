import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, ThumbsUp, ThumbsDown, Copy, Sparkles, Lightbulb, TrendingUp, AlertCircle, Clock, ChevronDown, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  quickActions?: string[];
  helpful?: boolean;
};

const guidanceResponses: Record<string, { response: string; quickActions?: string[] }> = {
  'hello': {
    response: 'Hi! 👋 I\'m your ExpenseAI assistant. I can help you with:\n\n• Adding and managing expenses\n• Understanding your spending patterns\n• Using the AI features\n• Navigating the dashboard\n• Setting budgets and goals\n• Analyzing financial health\n\nWhat would you like help with?',
    quickActions: ['How to add expense', 'View my insights', 'Set a budget']
  },
  'hi': {
    response: 'Hello! 👋 Welcome to ExpenseAI! How can I help you today?',
    quickActions: ['Add expense', 'View spending', 'Get tips']
  },
  'help': {
    response: 'I can help you with:\n\n📊 **Dashboard** - View your expenses and insights\n➕ **Add Expense** - Use the form to add new expenses\n📈 **Charts** - Visualize your spending by category\n💡 **AI Insights** - Get smart suggestions about your spending\n🎯 **Budget** - Set and track spending limits\n📊 **Analytics** - Advanced spending analysis\n\nWhat would you like to know more about?',
    quickActions: ['Add expense', 'View insights', 'Set budget', 'Analyze spending']
  },
  'add expense': {
    response: 'To add an expense:\n\n1. Fill in the description (e.g., "Lunch at cafe")\n2. Enter the amount\n3. Select or type a category\n4. Choose the date\n5. Click "Add Expense"\n\n💡 The AI will automatically suggest categories based on your description! Try using natural language like "bread and omelette for breakfast" for better categorization.',
    quickActions: ['What categories exist?', 'How to edit expense', 'Delete expense']
  },
  'category': {
    response: 'Categories help organize your spending. Available categories include:\n\n🍽️ **Food & Dining** - Restaurants, groceries, meals\n🚗 **Transportation** - Uber, petrol, parking\n🛍️ **Shopping** - Amazon, clothes, electronics\n🎬 **Entertainment** - Netflix, movies, subscriptions\n💡 **Bills & Utilities** - Electricity, internet, phone\n🏥 **Healthcare** - Medicine, doctor visits\n📚 **Education** - Courses, books, tuition\n✈️ **Travel** - Hotels, flights, trips\n📦 **Other** - Everything else\n\nYou can create custom categories by typing them in the category field!',
    quickActions: ['How to add custom category', 'View category breakdown', 'Most used categories']
  },
  'insights': {
    response: 'The AI Insights panel provides advanced analytics:\n\n📈 **Spending Velocity** - Daily average and monthly projections\n🎯 **Category Analysis** - Top spending categories and concentration\n🔍 **Anomaly Detection** - Unusual spending patterns\n📊 **Trend Analysis** - Week-over-week spending changes\n💡 **Smart Recommendations** - Personalized savings tips\n🏥 **Financial Health Score** - Overall financial wellness (0-100)\n\nThe AI analyzes your spending patterns in real-time to provide actionable insights!',
    quickActions: ['Improve financial health', 'Reduce spending', 'Set budget goals']
  },
  'delete': {
    response: 'To delete an expense:\n\n1. Find the expense in your list\n2. Click the delete button (trash icon)\n3. Confirm the deletion\n\n⚠️ This action cannot be undone! The expense will be permanently removed from your records.\n\n💡 Consider archiving important expenses instead of deleting them for tax purposes.',
    quickActions: ['How to edit instead', 'View deleted items', 'Backup data']
  },
  'edit': {
    response: 'To edit an expense:\n\n1. Find the expense in your list\n2. Click the edit button (pencil icon)\n3. Modify the description, amount, category, date, or notes\n4. Click "Save changes"\n\n💡 You can also add notes to expenses for better tracking and future reference.',
    quickActions: ['Change category', 'Add notes', 'Edit multiple']
  },
  'chart': {
    response: 'The spending charts provide visual analytics:\n\n📊 **Spending Chart** - Bar chart showing expenses by category\n🥧 **Category Pie Chart** - Visual breakdown of spending percentages\n\nThese charts help you:\n• Identify spending patterns\n• Spot budget overruns\n• Compare category performance\n• Make informed financial decisions\n\nHover over chart elements for detailed information!',
    quickActions: ['View pie chart', 'Compare months', 'Export chart data']
  },
  'budget': {
    response: 'Budgeting features in ExpenseAI:\n\n🎯 **AI-Recommended Budget** - Based on your spending patterns\n📊 **Category Budgets** - Set limits per spending category\n⚠️ **Budget Alerts** - Get notified when approaching limits\n📈 **Progress Tracking** - Visual budget vs actual spending\n\n💡 The AI analyzes your spending velocity to recommend optimal budget levels with a 10% savings buffer.',
    quickActions: ['Set monthly budget', 'Category budgets', 'Budget alerts']
  },
  'tips': {
    response: '💡 Smart money-saving tips:\n\n🍳 **Food & Dining**: Meal prep can save 30-40% on food costs\n🚗 **Transportation**: Carpool or use public transit to save 15%\n🎬 **Entertainment**: Audit subscriptions regularly\n🛍️ **Shopping**: Use the 24-hour rule for impulse purchases\n💡 **Bills**: Set up autopay to avoid late fees\n🏥 **Healthcare**: Use preventive care to avoid bigger costs\n\nWould you like specific tips for any category?',
    quickActions: ['Food savings tips', 'Reduce entertainment costs', 'Transportation savings']
  },
  'export': {
    response: 'Data export options:\n\n📊 **Current View**: All expenses are stored locally in your browser\n💾 **Backup**: Your data persists in the application\n📱 **Cross-device**: Currently single-device focused\n\nFuture updates may include:\n• CSV export\n• PDF reports\n• Cloud sync\n• Multi-device access',
    quickActions: ['Backup my data', 'Export to CSV', 'Sync across devices']
  },
  'ai': {
    response: 'ExpenseAI uses advanced AI for:\n\n🧠 **Smart Categorization** - Auto-categorizes expenses using NLP and fuzzy matching\n📊 **Predictive Analytics** - Projects monthly spending based on velocity\n🔍 **Anomaly Detection** - Identifies unusual spending patterns\n💡 **Personalized Insights** - Tailored recommendations based on your habits\n🎯 **Budget Optimization** - AI-recommended budget levels\n🏥 **Financial Health** - Comprehensive wellness scoring\n\nThe AI learns from your spending patterns to provide increasingly accurate and personalized insights!',
    quickActions: ['How AI works', 'Improve accuracy', 'AI features']
  },
  'security': {
    response: '🔒 Security & Privacy:\n\n• All data stored locally on your device\n• No cloud data transmission\n• No third-party data sharing\n• Your financial data stays private\n• Encrypted local storage\n\n💡 Your data never leaves your device, ensuring maximum privacy and security.',
    quickActions: ['Data privacy', 'Local storage', 'Encryption details']
  },
  'troubleshoot': {
    response: 'Common issues and solutions:\n\n❌ **App not loading**: Refresh the page or restart the app\n❌ **Data not saving**: Check browser storage permissions\n❌ **AI not categorizing**: Try more descriptive expense descriptions\n❌ **Charts not showing**: Ensure you have expenses added\n❌ **Sync issues**: Currently single-device focused\n\nNeed more help? Contact support for assistance.',
    quickActions: ['Contact support', 'Report bug', 'Reset app data']
  },
  'default': {
    response: 'I\'m here to help you with ExpenseAI! You can ask me about:\n\n• Adding and managing expenses\n• Categories and organization\n• AI insights and analytics\n• Budgeting and goals\n• Charts and visualization\n• Security and privacy\n• Troubleshooting\n\nTry asking "How do I add an expense?" or "Show me my spending insights"',
    quickActions: ['Add expense', 'View insights', 'Set budget', 'Get tips']
  }
};

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hi! 👋 I\'m your ExpenseAI assistant. I can help you with:\n\n• Adding and managing expenses\n• Understanding your spending patterns\n• Using the AI features\n• Setting budgets and goals\n• Analyzing financial health\n\nWhat would you like help with?',
      sender: 'bot',
      timestamp: new Date(),
      quickActions: ['How to add expense', 'View my insights', 'Set a budget']
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join('');
          setInputValue(transcript);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    // Initialize speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthesisRef.current = window.speechSynthesis;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setInputValue('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const speak = (text: string) => {
    if (!voiceEnabled || !synthesisRef.current) return;
    
    synthesisRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthesisRef.current.speak(utterance);
  };

  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
    if (!voiceEnabled && synthesisRef.current) {
      synthesisRef.current.cancel();
    }
  };

  const getBotResponse = (userMessage: string): { response: string; quickActions?: string[] } => {
    const lowerMessage = userMessage.toLowerCase();
    
    for (const [key, data] of Object.entries(guidanceResponses)) {
      if (lowerMessage.includes(key) && key !== 'default') {
        return data;
      }
    }
    
    return guidanceResponses.default;
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const responseData = getBotResponse(inputValue);
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: responseData.response,
        sender: 'bot',
        timestamp: new Date(),
        quickActions: responseData.quickActions
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
      
      // Speak the bot response
      if (voiceEnabled) {
        speak(responseData.response);
      }
    }, 1000);
  };

  const handleQuickAction = (action: string) => {
    setInputValue(action);
    handleSendMessage();
  };

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleFeedback = (messageId: string, helpful: boolean) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, helpful } : msg
    ));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 group"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
          <span className="absolute -top-12 right-0 bg-slate-800 text-white text-xs px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Need help?
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-cyan-500 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">ExpenseAI Assistant</h3>
                <p className="text-white/80 text-xs">Always here to help</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="h-96 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] ${message.sender === 'user' ? 'flex flex-col items-end' : ''}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white'
                        : 'bg-white/10 text-white border border-white/20'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {message.sender === 'bot' && <Bot className="w-4 h-4 mt-0.5 text-cyan-400 flex-shrink-0" />}
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.text}</p>
                      {message.sender === 'user' && <User className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                    </div>
                  </div>
                  
                  {/* Message actions */}
                  <div className={`flex items-center gap-2 mt-1 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-xs text-slate-500">{formatTime(message.timestamp)}</span>
                    {message.sender === 'bot' && (
                      <>
                        <button
                          onClick={() => handleCopyMessage(message.text)}
                          className="text-slate-500 hover:text-cyan-400 transition-colors"
                          title="Copy message"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleFeedback(message.id, true)}
                          className={`transition-colors ${message.helpful === true ? 'text-green-400' : 'text-slate-500 hover:text-green-400'}`}
                          title="Helpful"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleFeedback(message.id, false)}
                          className={`transition-colors ${message.helpful === false ? 'text-red-400' : 'text-slate-500 hover:text-red-400'}`}
                          title="Not helpful"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Quick actions */}
                  {message.sender === 'bot' && message.quickActions && message.quickActions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {message.quickActions.map((action, index) => (
                        <button
                          key={index}
                          onClick={() => handleQuickAction(action)}
                          className="text-xs bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 px-3 py-1.5 rounded-full border border-cyan-500/30 transition-all"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white/10 border border-white/20 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-cyan-400" />
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-slate-900/50 border-t border-white/10">
            <div className="flex gap-2 items-center">
              <button
                onClick={isListening ? stopListening : startListening}
                className={`p-3 rounded-xl transition-all ${
                  isListening 
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
                title={isListening ? 'Stop listening' : 'Start voice input'}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isListening ? 'Listening...' : 'Ask me anything...'}
                className={`flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 ${isListening ? 'border-cyan-400' : ''}`}
              />
              <button
                onClick={toggleVoice}
                className={`p-3 rounded-xl transition-all ${
                  voiceEnabled 
                    ? 'bg-white/10 hover:bg-white/20 text-white' 
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-400'
                }`}
                title={voiceEnabled ? 'Voice enabled' : 'Voice disabled'}
              >
                {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-slate-400">
                Powered by AI • Your data stays local
              </p>
              {isListening && (
                <p className="text-xs text-cyan-400 animate-pulse">
                  🎙️ Listening...
                </p>
              )}
              {isSpeaking && (
                <p className="text-xs text-purple-400 animate-pulse">
                  🔊 Speaking...
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
