'use client';

import React, { useState } from 'react';
import { parseTokens, calculateSimpleROI } from '@/utils/tokenParser';
import { Task, TaskSection } from '@/types/task';
import { DecisionViews } from '@/components/ui/DecisionViews';

export default function TaskTestPage() {
  const [input, setInput] = useState('Build landing page #10M ~4h @john :website !2024-02-15');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<'parser' | 'decisions'>('parser');

  const parseTask = () => {
    const tokens = parseTokens(input);
    const roi = calculateSimpleROI(tokens.netValue, tokens.effort);
    
    const newTask: Task = {
      id: Date.now().toString(),
      blockId: `block-${Date.now()}`,
      userId: 'demo-user',
      pageId: 'demo-page',
      content: input,
      rawContent: input,
      section: 'NextStep',
      subtasks: [],
      ...tokens,
      roi,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setTasks(prev => [...prev, newTask]);
    setInput(''); // Clear input after adding
  };

  // Add sample tasks for testing Decision Views
  const addSampleTasks = () => {
    const sampleTasks: Task[] = [
      {
        id: 'sample-1',
        blockId: 'block-sample-1',
        userId: 'demo-user',
        pageId: 'demo-page',
        content: 'Complete high-value client project #50M ~10h @sarah :enterprise',
        rawContent: 'Complete high-value client project #50M ~10h @sarah :enterprise',
        section: 'NextStep',
        subtasks: [],
        netValue: 50,
        effort: 10,
        roi: 5.0,
        assignee: 'sarah',
        project: 'enterprise',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'sample-2',
        blockId: 'block-sample-2',
        userId: 'demo-user',
        pageId: 'demo-page',
        content: 'Quick bug fix #1M ~0.5h @dev :maintenance',
        rawContent: 'Quick bug fix #1M ~0.5h @dev :maintenance',
        section: '2mins',
        subtasks: [],
        netValue: 1,
        effort: 0.5,
        roi: 2.0,
        assignee: 'dev',
        project: 'maintenance',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'sample-3',
        blockId: 'block-sample-3',
        userId: 'demo-user',
        pageId: 'demo-page',
        content: 'Research new technology (missing effort) #20M',
        rawContent: 'Research new technology (missing effort) #20M',
        section: 'Later',
        subtasks: [],
        netValue: 20,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'sample-4',
        blockId: 'block-sample-4',
        userId: 'demo-user',
        pageId: 'demo-page',
        content: 'Team meeting (missing value) ~2h @team :admin',
        rawContent: 'Team meeting (missing value) ~2h @team :admin',
        section: 'NextStep',
        subtasks: [],
        effort: 2,
        assignee: 'team',
        project: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'sample-5',
        blockId: 'block-sample-5',
        userId: 'demo-user',
        pageId: 'demo-page',
        content: 'Marketing campaign #15M ~3h @marketing :promo',
        rawContent: 'Marketing campaign #15M ~3h @marketing :promo',
        section: 'Delegate',
        subtasks: [],
        netValue: 15,
        effort: 3,
        roi: 5.0,
        assignee: 'marketing',
        project: 'promo',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    
    setTasks(prev => [...prev, ...sampleTasks]);
  };

  const handleMoveTask = async (taskId: string, toSection: TaskSection): Promise<boolean> => {
    // Check WIP limit for NextStep
    if (toSection === 'NextStep') {
      const currentNextStepTasks = tasks.filter(t => t.section === 'NextStep').length;
      const isTaskAlreadyInNextStep = tasks.find(t => t.id === taskId)?.section === 'NextStep';
      
      if (!isTaskAlreadyInNextStep && currentNextStepTasks >= 3) {
        alert('WIP Limit: Cannot have more than 3 tasks in Next Step');
        return false;
      }
    }
    
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, section: toSection, updatedAt: new Date() }
        : task
    ));
    return true;
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { 
            ...task, 
            ...updates, 
            roi: calculateSimpleROI(updates.netValue || task.netValue, updates.effort || task.effort),
            updatedAt: new Date() 
          }
        : task
    ));
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Decision-First To-Do System</h1>
      
      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('parser')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'parser'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🔧 Token Parser ({tasks.length} tasks)
        </button>
        <button
          onClick={() => setActiveTab('decisions')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'decisions'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📊 Decision Views
        </button>
      </div>

      {/* Parser Tab */}
      {activeTab === 'parser' && (
        <div className="space-y-8">
          {/* Input Section */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Input (with tokens):
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Build landing page #10M ~4h @john :website !2024-02-15"
            />
            <div className="mt-3 flex gap-3">
              <button
                onClick={parseTask}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Parse & Add Task
              </button>
              <button
                onClick={addSampleTasks}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Add Sample Tasks
              </button>
              <button
                onClick={() => setTasks([])}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Parse Preview */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium mb-3">Parse Preview:</h3>
            {(() => {
              const tokens = parseTokens(input);
              const roi = calculateSimpleROI(tokens.netValue, tokens.effort);
              
              return (
                <div className="space-y-2 text-sm">
                  <p><strong>Content:</strong> {input}</p>
                  <p><strong>Net Value:</strong> {tokens.netValue ? `$${tokens.netValue}M` : 'Not specified'}</p>
                  <p><strong>Effort:</strong> {tokens.effort ? `${tokens.effort}h` : 'Not specified'}</p>
                  <p><strong>Assignee:</strong> {tokens.assignee || 'Not specified'}</p>
                  <p><strong>Project:</strong> {tokens.project || 'Not specified'}</p>
                  <p><strong>Due Date:</strong> {tokens.due ? tokens.due.toDateString() : 'Not specified'}</p>
                  <p><strong>ROI:</strong> {roi !== undefined ? roi.toFixed(2) : 'Cannot calculate (missing value or effort)'}</p>
                </div>
              );
            })()}
          </div>

          {/* Tasks List */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Added Tasks ({tasks.length}):</h3>
            {tasks.map(task => (
              <div key={task.id} className="p-4 border border-gray-200 rounded-lg bg-white">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium">{task.content}</h4>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className={`px-2 py-1 rounded ${
                        task.section === 'NextStep' ? 'bg-blue-100 text-blue-800' :
                        task.section === '2mins' ? 'bg-green-100 text-green-800' :
                        task.section === 'Delegate' ? 'bg-yellow-100 text-yellow-800' :
                        task.section === 'Later' ? 'bg-gray-100 text-gray-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {task.section}
                      </span>
                      {task.netValue && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                          ${task.netValue}M
                        </span>
                      )}
                      {task.effort && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {task.effort}h
                        </span>
                      )}
                      {task.assignee && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                          @{task.assignee}
                        </span>
                      )}
                      {task.project && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                          :{task.project}
                        </span>
                      )}
                      {task.due && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
                          {task.due.toDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {task.roi !== undefined && (
                    <div className="ml-4 text-right">
                      <div className="text-lg font-bold text-green-600">
                        ROI: {task.roi.toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {tasks.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                No tasks added yet. Enter a task above to see the parsing in action.
              </p>
            )}
          </div>

          {/* Usage Examples */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-medium mb-3">Token Examples:</h3>
            <div className="text-sm space-y-1">
              <p><code>#10M</code> = Net Value: $10 Million</p>
              <p><code>~4h</code> = Effort: 4 hours</p>
              <p><code>@john</code> = Assignee: john</p>
              <p><code>:website</code> = Project: website</p>
              <p><code>!2024-02-15</code> = Due Date: 2024-02-15</p>
              <p><strong>ROI</strong> = Net Value ÷ Effort (when both specified)</p>
            </div>
          </div>
        </div>
      )}

      {/* Decision Views Tab */}
      {activeTab === 'decisions' && (
        <DecisionViews
          tasks={tasks}
          onMoveTask={handleMoveTask}
          onUpdateTask={handleUpdateTask}
        />
      )}
    </div>
  );
}
