'use client';

import React, { useState, useRef, useEffect } from 'react';
import { geminiAssistant, ActionSuggestion, ChatContext } from '@/lib/ai/gemini';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AIHistoryMessage } from '@/lib/ai/gemini';
import { Block } from '@/types/index';
import { Task, TaskCompany } from '@/types/task';
import { useAuth } from '@/contexts/AuthContext';
import { getTodoBlocks } from '@/lib/firestore';
import { X, MessageCircle, Send, Minimize2, Maximize2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: ActionSuggestion[];
}

export function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hi! I'm your AI assistant. I can help you prioritize tasks, estimate values, break down complex work, and make better decisions. What would you like to know?",
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
  const [blocks, setBlocks] = useState<Block[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load todo blocks on mount
  useEffect(() => {
    if (user) {
      loadTodoBlocks();
    }
  }, [user]);

  const loadTodoBlocks = async () => {
    if (!user) return;
    try {
      const todoBlocks = await getTodoBlocks(user.uid);
      setBlocks(todoBlocks);
    } catch (error) {
      console.error('Error loading todo blocks:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !user) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Convert blocks to Task format for the AI
      const tasks: Task[] = blocks.map(block => ({
        // Core identifiers
        id: block.id,
        blockId: block.id,
        pageId: block.pageId || '',
        userId: user.uid,
        
        // Content
        content: block.content,
        rawContent: block.content, // We don't have the raw content with tokens
        
        // Decision metrics from taskMetadata
        value: block.taskMetadata?.value,
        effort: block.taskMetadata?.effort,
        roi: block.taskMetadata?.roi,
        
        // Task metadata
        status: block.taskMetadata?.status || 'someday',
        company: block.taskMetadata?.company as TaskCompany | undefined,
        dueDate: block.taskMetadata?.dueDate,
        assignee: block.taskMetadata?.assignee,
        
        // Hierarchy
        parentTaskId: block.taskMetadata?.parentTaskId,
        subtaskIds: block.taskMetadata?.subtaskIds || [],
        
        // State
        isCompleted: block.isChecked || false,
        completedAt: block.taskMetadata?.completedAt,
        
        // Timestamps
        createdAt: block.createdAt || new Date(),
        updatedAt: block.updatedAt || new Date(),
        promotedToNextAt: block.taskMetadata?.promotedToNextAt
      }));

      const context: ChatContext = {
        tasks,
        userQuery: userMessage.content
      };

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

      setMessages([...nextMessages, assistantMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages([...nextMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: ActionSuggestion) => {
    setInput(suggestion.title);
    inputRef.current?.focus();
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors z-50"
        title="Open AI Assistant"
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 transition-all ${
      isMinimized ? 'w-80 h-14' : 'w-96 h-[600px]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <h3 className="font-semibold text-sm text-gray-800">AI Assistant</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4" style={{ height: 'calc(100% - 120px)' }}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white rounded-l-lg rounded-br-lg'
                    : 'bg-gray-100 text-gray-800 rounded-r-lg rounded-bl-lg'
                } px-3 py-2`}>
                  <div className="text-sm prose prose-sm max-w-none">
                    {message.type === 'assistant' ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      message.content
                    )}
                  </div>
                  {message.suggestions && (
                    <div className="mt-2 space-y-1">
                      {message.suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="block w-full text-left px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors"
                        >
                          <div className="font-medium">{suggestion.title}</div>
                          {suggestion.description && (
                            <div className="text-xs opacity-80">{suggestion.description}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 rounded-r-lg rounded-bl-lg px-3 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 px-4 py-3">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask about your tasks..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}