'use client';

import React, { useState, useEffect } from 'react';
import { Block } from '@/types/index';
import { formatValue, formatEffort, formatDueDate } from '@/utils/smartTokenParser';
import { useAuth } from '@/contexts/AuthContext';
import { getTodoBlocks } from '@/lib/firestore';

type ViewMode = 'board' | 'table' | 'priority';

export function SmartView() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('board');

  useEffect(() => {
    if (!user) return;

    const loadTasks = async () => {
      try {
        const todoBlocks = await getTodoBlocks(user.uid);
        
        // Add computed ROI to each block
        const tasksWithROI = todoBlocks.map(block => {
          const value = block.taskMetadata?.value || 0;
          const effort = block.taskMetadata?.effort || 1;
          let roi = 0;
          if (value > 0 && effort > 0) {
            roi = value / effort;
          } else if (value > 0) {
            roi = value / 0.1;
          }
          
          return {
            ...block,
            taskMetadata: {
              ...block.taskMetadata,
              roi: isFinite(roi) && roi > 0 ? roi : 0
            }
          } as Block;
        });
        
        setTasks(tasksWithROI);
      } catch (error) {
        console.error('Error loading tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
    
    // Refresh every 5 seconds for real-time updates
    const interval = setInterval(loadTasks, 5000);
    return () => clearInterval(interval);
  }, [user]);


  if (loading) {
    return <div className="p-6 text-gray-500">Loading smart view...</div>;
  }

  // Group tasks by status for board view
  const tasksByStatus = tasks.reduce((acc, task) => {
    const status = task.taskMetadata?.status || 'someday';
    if (!acc[status]) acc[status] = [];
    acc[status].push(task);
    return acc;
  }, { now: [], next: [], waiting: [], someday: [], done: [] } as Record<string, Block[]>);

  // Sort tasks by ROI for priority/ROI views
  const sortedByROI = [...tasks].sort((a, b) => 
    (b.taskMetadata?.roi || 0) - (a.taskMetadata?.roi || 0)
  );

  // Filter high-ROI and missing data tasks
  const highROITasks = sortedByROI.filter(task => 
    task.taskMetadata?.roi && task.taskMetadata.roi > 0
  ).slice(0, 10);
  const missingDataTasks = tasks.filter(task => 
    !task.taskMetadata?.value || !task.taskMetadata?.effort
  );

  const renderBoardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {(['now', 'next', 'waiting', 'someday', 'done'] as TaskStatus[]).map((status) => (
        <TaskColumn
          key={status}
          status={status}
          tasks={tasksByStatus[status] || []}
          dragEnabled={false}
        />
      ))}
    </div>
  );

  const renderTableView = () => (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ROI</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Effort</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedByROI.map((task) => (
            <TaskTableRow key={task.id} task={task} />
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderPriorityView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">🔥 High Priority Tasks</h3>
          <p className="text-sm text-gray-500 mt-1">Based on ROI and urgency</p>
        </div>
        <div className="divide-y divide-gray-100">
          {highROITasks.slice(0, 5).map((task) => (
            <TaskPriorityRow key={task.id} task={task} />
          ))}
        </div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">📊 Need More Info</h3>
          <p className="text-sm text-gray-500 mt-1">Tasks missing value or effort data</p>
        </div>
        <div className="divide-y divide-gray-100">
          {missingDataTasks.slice(0, 5).map((task) => (
            <TaskMissingDataRow key={task.id} task={task} />
          ))}
        </div>
      </div>
    </div>
  );


  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🧠 Smart View</h2>
          <p className="text-gray-500 mt-1">Intelligent task management with multiple perspectives</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('board')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'board' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 Board
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'table' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📊 Table
          </button>
          <button
            onClick={() => setViewMode('priority')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'priority' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🎯 Priority
          </button>
        </div>
      </div>

      {viewMode === 'board' && renderBoardView()}
      {viewMode === 'table' && renderTableView()}
      {viewMode === 'priority' && renderPriorityView()}
    </div>
  );
}

// Helper Components
type TaskStatus = 'now' | 'next' | 'waiting' | 'someday' | 'done';

function TaskColumn({ status, tasks, dragEnabled = true }: {
  status: TaskStatus;
  tasks: Block[];
  dragEnabled?: boolean;
}) {
  const statusConfig: Record<TaskStatus, { title: string; color: string }> = {
    now: { title: '⚡ Now', color: 'bg-blue-50' },
    next: { title: '⏭️ Next', color: 'bg-green-50' },
    waiting: { title: '⏳ Waiting', color: 'bg-yellow-50' },
    someday: { title: '💭 Someday', color: 'bg-gray-50' },
    done: { title: '✅ Done', color: 'bg-emerald-50' }
  };

  const config = statusConfig[status];

  return (
    <div className={`rounded-lg border border-gray-200 ${config.color} min-h-[200px]`}>
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">{config.title}</h3>
          <span className="text-sm text-gray-500">{tasks.length}</span>
        </div>
        
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              dragEnabled={dragEnabled}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task, dragEnabled = true }: {
  task: Block;
  dragEnabled?: boolean;
}) {
  return (
    <div
      draggable={dragEnabled}
      className={`p-3 bg-white rounded-lg border border-gray-200 shadow-sm transition-shadow ${
        dragEnabled ? 'cursor-move hover:shadow-md' : 'hover:bg-gray-50'
      }`}
    >
      <div className="text-sm text-gray-900 line-clamp-2 mb-2">{task.content}</div>
      
      {(task.taskMetadata?.roi !== undefined && isFinite(task.taskMetadata.roi)) && (
        <div className={`text-xs font-medium mb-2 ${
          (task.taskMetadata?.roi || 0) > 0 ? 'text-green-600' : 'text-gray-500'
        }`}>
          ROI: {(task.taskMetadata?.roi || 0) > 0 ? `$${Math.round(task.taskMetadata?.roi || 0).toLocaleString()}/h` : 'Incomplete'}
        </div>
      )}
      
      <div className="flex items-center gap-2 text-xs">
        {task.taskMetadata?.dueDate && (
          <span className={`px-1.5 py-0.5 rounded ${
            new Date(task.taskMetadata.dueDate) < new Date(Date.now() + 86400000) ? 'bg-red-100 text-red-600' :
            new Date(task.taskMetadata.dueDate) < new Date(Date.now() + 259200000) ? 'bg-yellow-100 text-yellow-600' :
            'bg-gray-100 text-gray-600'
          }`}>
            {formatDueDate(task.taskMetadata.dueDate)}
          </span>
        )}
        {task.taskMetadata?.company && (
          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded">
            {task.taskMetadata.company}
          </span>
        )}
      </div>
    </div>
  );
}

function TaskTableRow({ task }: { task: Block }) {
  const statusColors: Record<TaskStatus, string> = {
    now: 'bg-blue-100 text-blue-700',
    next: 'bg-green-100 text-green-700',
    waiting: 'bg-purple-100 text-purple-700',
    someday: 'bg-gray-100 text-gray-700',
    done: 'bg-emerald-100 text-emerald-700'
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900 line-clamp-2">{task.content}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[task.taskMetadata?.status || 'someday']}`}>
          {task.taskMetadata?.status || 'someday'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {task.taskMetadata?.roi && task.taskMetadata.roi > 0 ? `$${Math.round(task.taskMetadata.roi).toLocaleString()}/h` : '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {task.taskMetadata?.value ? formatValue(task.taskMetadata.value) : '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {task.taskMetadata?.effort ? formatEffort(task.taskMetadata.effort) : '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {task.taskMetadata?.dueDate ? formatDueDate(task.taskMetadata.dueDate) : '-'}
      </td>
    </tr>
  );
}

function TaskPriorityRow({ task }: { task: Block }) {
  const urgency = task.taskMetadata?.dueDate 
    ? new Date(task.taskMetadata.dueDate) < new Date(Date.now() + 86400000) ? 'urgent' :
      new Date(task.taskMetadata.dueDate) < new Date(Date.now() + 259200000) ? 'soon' : null
    : null;
  
  return (
    <div className="p-4 hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{task.content}</span>
            {urgency && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                urgency === 'urgent' ? 'bg-red-100 text-red-700' :
                urgency === 'soon' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {urgency}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            {task.taskMetadata?.value && <span>💰 {formatValue(task.taskMetadata.value)}</span>}
            {task.taskMetadata?.effort && <span>⏱️ {formatEffort(task.taskMetadata.effort)}</span>}
            {task.taskMetadata?.dueDate && <span>📅 {formatDueDate(task.taskMetadata.dueDate)}</span>}
          </div>
        </div>
        
        {task.taskMetadata?.roi && task.taskMetadata.roi > 0 && (
          <div className="text-right">
            <div className="text-lg font-bold text-green-600">
              ${Math.round(task.taskMetadata?.roi || 0).toLocaleString()}/h
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskMissingDataRow({ task }: { task: Block }) {
  const missingFields = [];
  if (!task.taskMetadata?.value) missingFields.push('Value');
  if (!task.taskMetadata?.effort) missingFields.push('Effort');
  // probability removed

  return (
    <div className="p-4 hover:bg-gray-50">
      <div className="text-sm font-medium text-gray-900 mb-2">{task.content}</div>
      <div className="flex flex-wrap gap-1">
        {missingFields.map((field) => (
          <span key={field} className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
            Missing {field}
          </span>
        ))}
      </div>
    </div>
  );
}