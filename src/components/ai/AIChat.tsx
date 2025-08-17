'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Task } from '@/types/task';
import { geminiAssistant, ActionSuggestion, ChatContext } from '@/lib/ai/gemini';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AIHistoryMessage } from '@/lib/ai/gemini';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: ActionSuggestion[];
}

interface AIChatProps {
  tasks: Task[];
  currentView?: 'board' | 'table' | 'priority' | 'roi';
  selectedTasks?: string[];
}

export function AIChat({ tasks, currentView, selectedTasks }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hi! I'm your AI task assistant. I can help you prioritize tasks, estimate values, break down complex work, and make better decisions. What would you like to know about your tasks?",
      timestamp: new Date(),
      suggestions: [
        {
          type: 'prioritize',
          title: 'What should I work on next?',
          description: 'Get prioritization recommendations'
        },
        {
          type: 'focus',
          title: 'Analyze my tasks',
          description: 'Get insights about your task list'
        }
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      const context: ChatContext = {
        tasks,
        currentView,
        selectedTasks,
        userQuery: userMessage.content
      };

      // Build minimal history for model (user/model roles)
      const history: AIHistoryMessage[] = nextMessages.map(m => ({
        role: m.type === 'user' ? ('user' as const) : ('model' as const),
        content: m.content
      }));

      const response = await geminiAssistant.chatWithHistory(history, context);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.reply,
        timestamp: new Date(),
        suggestions: response.suggestions
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Chat error:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I'm having trouble connecting right now. Please ensure Vertex AI API is enabled for your Firebase project and billing is active. In the meantime, I can still help with basic task analysis using local algorithms.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSuggestionClick = async (suggestion: ActionSuggestion) => {
    let query = '';
    
    switch (suggestion.type) {
      case 'prioritize':
        query = suggestion.title.toLowerCase().includes('what') 
          ? 'What should I work on next?' 
          : 'Help me prioritize my tasks';
        break;
      case 'estimate':
        query = 'Help me estimate values and effort for my tasks';
        break;
      case 'breakdown':
        query = 'Which tasks should I break down into smaller pieces?';
        break;
      case 'focus':
        query = suggestion.title.toLowerCase().includes('analyze')
          ? 'Analyze my current task situation'
          : 'What should I focus on?';
        break;
      default:
        query = suggestion.title;
    }

    setInput(query);
    inputRef.current?.focus();
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
  <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm">🤖</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">AI Task Assistant</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Powered by Gemini • {tasks.length} tasks loaded</p>
          </div>
        </div>
      </div>

      {/* Messages */}
  <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
        className={`max-w-[80%] rounded-lg p-3 ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.type === 'assistant' ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                ) : (
                  message.content
                )}
              </div>
              
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Suggested actions:</div>
                  {message.suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="block w-full text-left p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs"
                    >
                      <div className="font-medium text-gray-900 dark:text-gray-100">{suggestion.title}</div>
                      <div className="text-gray-500 dark:text-gray-400">{suggestion.description}</div>
                    </button>
                  ))}
                </div>
              )}
              
              <div className={`text-xs mt-2 opacity-70 ${
                message.type === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 max-w-[80%]">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
  <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me about your tasks..."
    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </form>
        
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            'What should I work on next?',
            'Analyze my tasks',
            'Help me prioritize',
            'Which tasks need estimates?'
          ].map((quickPrompt) => (
            <button
              key={quickPrompt}
              onClick={() => setInput(quickPrompt)}
      className="text-xs px-2 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-900 dark:text-gray-100"
            >
              {quickPrompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}