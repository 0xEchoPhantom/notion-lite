'use client';

import React, { useState, useMemo } from 'react';
import { Task, TaskSection } from '@/types/task';
import { FIXED_PAGES } from '@/constants/fixedPages';

interface TaskPageViewProps {
  pageId: string;
  tasks: Task[];
  onMoveTask: (taskId: string, toSection: TaskSection) => Promise<boolean>;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onAddTask: (content: string, section: TaskSection) => void;
}

export const TaskPageView: React.FC<TaskPageViewProps> = ({
  pageId,
  tasks,
  onMoveTask,
  onUpdateTask,
  onAddTask
}) => {
  const [newTaskContent, setNewTaskContent] = useState('');
  
  // Find current page config
  const currentPage = FIXED_PAGES.find(p => p.id === pageId);
  if (!currentPage) return <div>Page not found</div>;

  // Filter tasks for this page section
  const pageTasks = useMemo(() => 
    tasks.filter(task => task.section === currentPage.section),
    [tasks, currentPage.section]
  );

  const handleAddTask = () => {
    if (newTaskContent.trim()) {
      onAddTask(newTaskContent.trim(), currentPage.section);
      setNewTaskContent('');
    }
  };

  const handleQuickMove = async (taskId: string, toSection: TaskSection) => {
    await onMoveTask(taskId, toSection);
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0) return `In ${diffDays} days`;
    return `${Math.abs(diffDays)} days ago`;
  };

  const TaskCard: React.FC<{ task: Task }> = ({ task }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-medium text-gray-900 flex-1 mr-3">{task.content}</h3>
        {task.roi !== undefined && (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-medium">
            ROI: {task.roi.toFixed(2)}
          </span>
        )}
      </div>
      
      {/* Task metadata */}
      <div className="flex flex-wrap gap-2 text-xs mb-3">
        {task.netValue && (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
            ${task.netValue}M
          </span>
        )}
        {task.effort && (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
            {task.effort}h
          </span>
        )}
        {task.due && (
          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">
            {formatDate(task.due)}
          </span>
        )}
        {task.assignee && (
          <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded">
            @{task.assignee}
          </span>
        )}
        {task.project && (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">
            :{task.project}
          </span>
        )}
      </div>
      
      {/* Quick actions */}
      <div className="flex gap-2">
        {currentPage.section !== 'NextStep' && (
          <button
            onClick={() => handleQuickMove(task.id, 'NextStep')}
            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
          >
            → Next Step
          </button>
        )}
        {currentPage.section !== '2mins' && (
          <button
            onClick={() => handleQuickMove(task.id, '2mins')}
            className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            ⚡ 2min
          </button>
        )}
        {currentPage.section !== 'Delegate' && (
          <button
            onClick={() => handleQuickMove(task.id, 'Delegate')}
            className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            👥 Delegate
          </button>
        )}
        {currentPage.section !== 'Pending' && (
          <button
            onClick={() => handleQuickMove(task.id, 'Pending')}
            className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            ⏳ Pending
          </button>
        )}
        <button
          onClick={() => handleQuickMove(task.id, 'Done')}
          className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          ✓ Done
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 p-6">
      {/* Page Header */}
      <div className={`${currentPage.bgColor} border rounded-lg p-6 mb-6`}>
        <div className="flex items-center space-x-4">
          <div className={`text-4xl`}>{currentPage.icon}</div>
          <div>
            <h1 className={`text-2xl font-bold ${currentPage.color}`}>
              {currentPage.title}
            </h1>
            <p className="text-gray-600 mt-1">{currentPage.description}</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span>{pageTasks.length} tasks</span>
              {pageTasks.filter(t => t.roi).length > 0 && (
                <span>
                  Avg ROI: {(
                    pageTasks
                      .filter(t => t.roi)
                      .reduce((sum, t) => sum + (t.roi || 0), 0) / 
                    pageTasks.filter(t => t.roi).length
                  ).toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add new task */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex space-x-3">
          <input
            type="text"
            value={newTaskContent}
            onChange={(e) => setNewTaskContent(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
            placeholder={`Add task to ${currentPage.title}... (try: Fix bug #5M ~2h @john)`}
            className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleAddTask}
            disabled={!newTaskContent.trim()}
            className={`px-6 py-3 rounded-md text-white font-medium ${
              newTaskContent.trim()
                ? `${currentPage.bgColor.replace('bg-', 'bg-').replace('-100', '-600')} hover:${currentPage.bgColor.replace('bg-', 'bg-').replace('-100', '-700')}`
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            Add Task
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          Use tokens: #5M (value), ~2h (effort), @john (assignee), :project (project), !2024-08-15 (due)
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {pageTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">{currentPage.icon}</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tasks in {currentPage.title}
            </h3>
            <p className="text-gray-600 mb-4">
              Add your first task to get started with {currentPage.description.toLowerCase()}.
            </p>
          </div>
        ) : (
          pageTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))
        )}
      </div>

      {/* Section-specific tips */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">💡 {currentPage.title} Tips</h3>
        <div className="text-sm text-gray-600">
          {currentPage.section === 'Capture' && (
            <p>Quickly capture all ideas here. Don't worry about details - just get it out of your head!</p>
          )}
          {currentPage.section === '2mins' && (
            <p>Tasks that take less than 2 minutes. Do them immediately when you have a moment.</p>
          )}
          {currentPage.section === 'NextStep' && (
            <p>Your priority tasks. Limit to 3 tasks maximum to maintain focus. Add ROI data for better prioritization.</p>
          )}
          {currentPage.section === 'Delegate' && (
            <p>Tasks assigned to others. Use @assignee to track who's responsible.</p>
          )}
          {currentPage.section === 'Pending' && (
            <p>Tasks waiting for dependencies. Set due dates to track when to follow up.</p>
          )}
        </div>
      </div>
    </div>
  );
};
