'use client';

import React, { useState } from 'react';
import { parseTokens, calculateSimpleROI } from '@/utils/tokenParser';
import { Task, TaskSection } from '@/types/task';
import { FixedPagesSidebar } from '@/components/ui/FixedPagesSidebar';
import { TaskPageView } from '@/components/ui/TaskPageView';
import { DecisionViews } from '@/components/ui/DecisionViews';
import { SettingsPanel } from '@/components/ui/SettingsPanel';
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext';

function TaskWorkspaceContent() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentView, setCurrentView] = useState<'tasks-overview' | string>('next-step');
  const { settings } = useSettings();

  // Add sample tasks for testing
  const addSampleTasks = () => {
    const sampleTasks: Task[] = [
      {
        id: 'sample-1',
        blockId: 'block-sample-1',
        userId: 'demo-user',
        pageId: 'demo-page',
        content: 'Review urgent client proposal #50M ~3h @sarah :enterprise',
        rawContent: 'Review urgent client proposal #50M ~3h @sarah :enterprise',
        section: 'NextStep',
        subtasks: [],
        netValue: 50,
        effort: 3,
        roi: 16.67,
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
        content: 'Quick email response to team #1M ~0.3h @dev :admin',
        rawContent: 'Quick email response to team #1M ~0.3h @dev :admin',
        section: '2mins',
        subtasks: [],
        netValue: 1,
        effort: 0.3,
        roi: 3.33,
        assignee: 'dev',
        project: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'sample-3',
        blockId: 'block-sample-3',
        userId: 'demo-user',
        pageId: 'demo-page',
        content: 'Random idea: Build AI chatbot for customer service',
        rawContent: 'Random idea: Build AI chatbot for customer service',
        section: 'Capture',
        subtasks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'sample-4',
        blockId: 'block-sample-4',
        userId: 'demo-user',
        pageId: 'demo-page',
        content: 'Design review meeting #5M ~2h @design :website',
        rawContent: 'Design review meeting #5M ~2h @design :website',
        section: 'Delegate',
        subtasks: [],
        netValue: 5,
        effort: 2,
        roi: 2.5,
        assignee: 'design',
        project: 'website',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'sample-5',
        blockId: 'block-sample-5',
        userId: 'demo-user',
        pageId: 'demo-page',
        content: 'Waiting for legal approval #10M ~1h @legal :compliance',
        rawContent: 'Waiting for legal approval #10M ~1h @legal :compliance',
        section: 'Pending',
        subtasks: [],
        netValue: 10,
        effort: 1,
        roi: 10,
        assignee: 'legal',
        project: 'compliance',
        due: new Date(2025, 7, 10), // August 10, 2025
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

  const handleAddTask = (content: string, section: TaskSection) => {
    const tokens = parseTokens(content);
    const roi = calculateSimpleROI(tokens.netValue, tokens.effort);
    
    const newTask: Task = {
      id: Date.now().toString(),
      blockId: `block-${Date.now()}`,
      userId: 'demo-user',
      pageId: 'demo-page',
      content,
      rawContent: content,
      section,
      subtasks: [],
      ...tokens,
      roi,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setTasks(prev => [...prev, newTask]);
  };

  const handlePageSelect = (pageId: string) => {
    setCurrentView(pageId);
  };

  const handleTasksViewSelect = () => {
    setCurrentView('tasks-overview');
  };

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <FixedPagesSidebar
        currentPageId={currentView !== 'tasks-overview' ? currentView : undefined}
        onPageSelect={handlePageSelect}
        onTasksViewSelect={handleTasksViewSelect}
        showTasksView={currentView === 'tasks-overview'}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {currentView === 'tasks-overview' ? '📊 Task Overview' : 'Task Workspace'}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {currentView === 'tasks-overview' 
                  ? 'Analytics and insights across all tasks'
                  : 'Decision-first task management with ROI prioritization'
                }
              </p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex space-x-3">
              <button
                onClick={addSampleTasks}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Add Sample Tasks
              </button>
              <button
                onClick={() => setTasks([])}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
              >
                Clear All
              </button>
              
              {/* Tasks Count */}
              <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-md">
                <span className="text-sm font-medium text-gray-700">
                  {tasks.length} tasks
                </span>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {currentView === 'tasks-overview' ? (
          <div className="flex-1 p-6">
            <DecisionViews
              tasks={tasks}
              onMoveTask={handleMoveTask}
              onUpdateTask={handleUpdateTask}
            />
          </div>
        ) : (
          <TaskPageView
            pageId={currentView}
            tasks={tasks}
            onMoveTask={handleMoveTask}
            onUpdateTask={handleUpdateTask}
            onAddTask={handleAddTask}
          />
        )}
      </div>

      {/* Settings Panel */}
      <SettingsPanel />
    </div>
  );
}

export default function TaskWorkspace() {
  return (
    <SettingsProvider>
      <TaskWorkspaceContent />
    </SettingsProvider>
  );
}
