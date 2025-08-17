'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
      content: "Hi! I'm your enhanced AI assistant with new superpowers! I can help you plan your day, run weekly reviews, handle crises, and much more. Try these commands or ask me anything!",
      timestamp: new Date(),
      suggestions: [
        {
          type: 'daily-plan',
          title: 'Plan my day',
          description: 'Get a time-blocked daily schedule'
        },
        {
          type: 'weekly-review',
          title: 'Weekly review',
          description: 'Analyze your week and get insights'
        },
        {
          type: 'crisis',
          title: "I'm overwhelmed",
          description: 'Crisis mode triage'
        },
        {
          type: 'prioritize',
          title: 'Optimize ROI',
          description: 'Focus on highest value tasks'
        },
        {
          type: 'procrastination',
          title: "I'm procrastinating",
          description: 'Get unstuck with actionable steps'
        },
        {
          type: 'time-audit',
          title: 'Time audit',
          description: 'See where your time is going'
        }
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadTodoBlocks = useCallback(async () => {
    if (!user) return;
    try {
      const todoBlocks = await getTodoBlocks(user.uid);
      console.log('Loaded todo blocks:', todoBlocks.length, 'tasks');
      setBlocks(todoBlocks);
    } catch (error) {
      console.error('Error loading todo blocks:', error);
    }
  }, [user]);

  // Load todo blocks on mount
  useEffect(() => {
    if (user) {
      loadTodoBlocks();
    }
  }, [user, loadTodoBlocks]);

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
      // Convert blocks to Task format for the AI - only include todo blocks
      const tasks: Task[] = blocks
        .filter(block => block.type === 'todo-list' || block.taskMetadata) // Only include todo blocks
        .map(block => ({
          // Core identifiers
          id: block.id,
          blockId: block.id,
          pageId: block.pageId || '',
          userId: user.uid,
          
          // Content
          content: block.content || '',
          rawContent: block.content || '', // We don't have the raw content with tokens
          
          // Decision metrics from taskMetadata
          value: block.taskMetadata?.value,
          effort: block.taskMetadata?.effort,
          roi: block.taskMetadata?.roi,
          
          // Task metadata
          status: block.taskMetadata?.status || (block.isChecked ? 'done' : 'someday'),
          company: (block.taskMetadata?.company as TaskCompany) || undefined,
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

  const handleSuggestionClick = async (suggestion: ActionSuggestion) => {
    // Directly send the suggestion title as a message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: suggestion.title,
      timestamp: new Date()
    };
    
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);
    
    try {
      // Build proper task context from blocks
      const tasks = blocks
        .filter(b => b.type === 'todo-list' || b.taskMetadata) // Only include todo blocks
        .map(b => ({
          id: b.id,
          blockId: b.id,
          pageId: b.pageId || '',
          userId: user?.uid || '',
          content: b.content || '',
          rawContent: b.content || '',
          value: b.taskMetadata?.value,
          effort: b.taskMetadata?.effort,
          roi: b.taskMetadata?.roi,
          status: b.taskMetadata?.status || (b.isChecked ? 'done' : 'someday'),
          company: b.taskMetadata?.company as TaskCompany | undefined,
          dueDate: b.taskMetadata?.dueDate,
          assignee: b.taskMetadata?.assignee,
          parentTaskId: b.taskMetadata?.parentTaskId,
          subtaskIds: b.taskMetadata?.subtaskIds || [],
          isCompleted: b.isChecked || false,
          completedAt: b.taskMetadata?.completedAt,
          createdAt: b.createdAt || new Date(),
          updatedAt: b.updatedAt || new Date(),
          promotedToNextAt: b.taskMetadata?.promotedToNextAt
        }));
      
      const context: ChatContext = {
        tasks,
        userQuery: suggestion.title
      };
      
      const response = await geminiAssistant.chatWithTasks(suggestion.title, context);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.reply,
        timestamp: new Date(),
        suggestions: response.suggestions
      };
      
      setMessages([...nextMessages, assistantMessage]);
    } catch (error) {
      console.error('AI Error:', error);
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
    <div className={`fixed ${isMinimized ? 'bottom-20 lg:bottom-6 right-4 lg:right-6 w-72 lg:w-80 h-14' : 'inset-4 lg:inset-auto lg:bottom-6 lg:right-6 lg:w-96 lg:h-[600px]'} bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 transition-all flex flex-col`}>
      {/* Header */}
  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <h3 className="font-semibold text-sm lg:text-base text-gray-800 dark:text-gray-100">AI Assistant</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4 lg:w-5 lg:h-5" /> : <Minimize2 className="w-4 h-4 lg:w-5 lg:h-5" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 lg:w-5 lg:h-5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
        <div className={`max-w-[80%] ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white rounded-l-lg rounded-br-lg'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-r-lg rounded-bl-lg'
                } px-3 py-2`}>
                  <div className="text-sm">
                    {message.type === 'assistant' ? (
                      <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <span>{message.content}</span>
                    )}
                  </div>
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.suggestions.slice(0, 4).map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(suggestion)}
              className={`block w-full text-left px-2 py-1 text-xs rounded transition-colors ${
                            message.type === 'user' 
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-100'
                          }`}
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
                <div className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-r-lg rounded-bl-lg px-3 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Commands */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2 flex gap-2 overflow-x-auto flex-shrink-0 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <button
              onClick={() => handleSuggestionClick({ type: 'daily-plan', title: 'Plan my day', description: '' })}
        className="px-3 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-xs whitespace-nowrap text-gray-900 dark:text-gray-100"
              disabled={isLoading}
            >
              📅 Daily
            </button>
            <button
              onClick={() => handleSuggestionClick({ type: 'weekly-review', title: 'Weekly review', description: '' })}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-xs whitespace-nowrap text-gray-900 dark:text-gray-100"
              disabled={isLoading}
            >
              📊 Weekly
            </button>
            <button
              onClick={() => handleSuggestionClick({ type: 'prioritize', title: 'Optimize ROI', description: '' })}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-xs whitespace-nowrap text-gray-900 dark:text-gray-100"
              disabled={isLoading}
            >
              💰 ROI
            </button>
            <button
              onClick={() => handleSuggestionClick({ type: 'crisis', title: "I'm overwhelmed", description: '' })}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-xs whitespace-nowrap text-gray-900 dark:text-gray-100"
              disabled={isLoading}
            >
              🚨 Crisis
            </button>
            <button
              onClick={() => handleSuggestionClick({ type: 'delegate', title: 'What to delegate', description: '' })}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-xs whitespace-nowrap text-gray-900 dark:text-gray-100"
              disabled={isLoading}
            >
              👥 Delegate
            </button>
            <button
              onClick={() => handleSuggestionClick({ type: 'report', title: 'Status report', description: '' })}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-xs whitespace-nowrap text-gray-900 dark:text-gray-100"
              disabled={isLoading}
            >
              📋 Report
            </button>
            <button
              onClick={() => handleSuggestionClick({ type: 'procrastination', title: "I'm procrastinating", description: '' })}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-xs whitespace-nowrap text-gray-900 dark:text-gray-100"
              disabled={isLoading}
            >
              🎯 Unstuck
            </button>
            <button
              onClick={() => handleSuggestionClick({ type: 'time-audit', title: 'Time audit', description: '' })}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-xs whitespace-nowrap text-gray-900 dark:text-gray-100"
              disabled={isLoading}
            >
              ⏱️ Time
            </button>
          </div>
          
          {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex-shrink-0">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
        placeholder="Try: 'Plan my day', 'Weekly review', 'I'm overwhelmed', 'Time audit'..."
        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}