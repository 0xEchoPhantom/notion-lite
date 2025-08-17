'use client';

import React, { useState, useEffect } from 'react';
import { Block } from '@/types/index';
import { formatValue, formatEffort, formatDueDate } from '@/utils/smartTokenParser';
import { formatROI } from '@/types/task';
import { 
  isStatusConsistentWithPage, 
  getStatusForPage
} from '../../utils/gtdStatusMapper';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToTodoBlocks } from '@/lib/firestore';

type ViewMode = 'board' | 'table' | 'priority';

export function SmartView() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('board');

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    
    // Use real-time subscription instead of polling
    const unsubscribe = subscribeToTodoBlocks(
      user.uid,
      (todoBlocks) => {
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
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [user]);


  if (loading) {
    return <div className="p-6 text-gray-500 dark:text-gray-400">Loading smart view...</div>;
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

  // Status consistency analysis
  const inconsistentTasks = tasks.filter(task => 
    !isStatusConsistentWithPage(task.taskMetadata, task.pageId)
  );
  const consistencyRate = tasks.length > 0 
    ? Math.round(((tasks.length - inconsistentTasks.length) / tasks.length) * 100)
    : 100;

  const renderBoardView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
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
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Task</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ROI</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Effort</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Due</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {sortedByROI.map((task) => (
            <TaskTableRow key={task.id} task={task} />
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderPriorityView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">🔥 High Priority Tasks</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Based on ROI and urgency</p>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {highROITasks.slice(0, 5).map((task) => (
            <TaskPriorityRow key={task.id} task={task} />
          ))}
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">📊 Need More Info</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tasks missing value or effort data</p>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {missingDataTasks.slice(0, 5).map((task) => (
            <TaskMissingDataRow key={task.id} task={task} />
          ))}
        </div>
      </div>
    </div>
  );


  return (
  <div className="p-3 lg:p-6 space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">🧠 Smart View</h2>
      <p className="text-gray-500 dark:text-gray-400 mt-1">Intelligent task management with multiple perspectives</p>
          
          {/* Status consistency indicator */}
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${
                consistencyRate >= 90 ? 'bg-green-500' : 
                consistencyRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
              }`}></span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Status Consistency: {consistencyRate}%
              </span>
            </div>
            {inconsistentTasks.length > 0 && (
              <span className="text-sm text-yellow-600">
                {inconsistentTasks.length} tasks need status alignment
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 lg:gap-2 flex-wrap">
          <button
            onClick={() => setViewMode('board')}
            className={`px-2 lg:px-3 py-1.5 text-xs lg:text-sm font-medium rounded-md transition-colors ${
              viewMode === 'board' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="hidden sm:inline">📋 </span>Board
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-2 lg:px-3 py-1.5 text-xs lg:text-sm font-medium rounded-md transition-colors ${
              viewMode === 'table' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="hidden sm:inline">📊 </span>Table
          </button>
          <button
            onClick={() => setViewMode('priority')}
            className={`px-2 lg:px-3 py-1.5 text-xs lg:text-sm font-medium rounded-md transition-colors ${
              viewMode === 'priority' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="hidden sm:inline">🎯 </span>Priority
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
  <div className={`rounded-lg border border-gray-200 dark:border-gray-700 ${config.color} min-h-[200px]`}>
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
      <h3 className="font-medium text-gray-900 dark:text-gray-100">{config.title}</h3>
      <span className="text-sm text-gray-500 dark:text-gray-400">{tasks.length}</span>
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
  // Check if task status is consistent with its page location
  const isConsistent = isStatusConsistentWithPage(task.taskMetadata, task.pageId);
  const expectedStatus = getStatusForPage(task.pageId);
  const currentStatus = task.taskMetadata?.status;
  
  return (
    <div
      draggable={dragEnabled}
      className={`p-3 bg-white dark:bg-gray-900 rounded-lg border transition-shadow ${
        isConsistent ? 'border-gray-200 dark:border-gray-700' : 'border-yellow-300 bg-yellow-50'
      } shadow-sm ${
        dragEnabled ? 'cursor-move hover:shadow-md' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      {/* Status inconsistency warning */}
      {!isConsistent && (
        <div className="flex items-center gap-1 mb-2">
          <span className="text-xs text-yellow-600">⚠️ Status mismatch:</span>
          <span className="text-xs text-yellow-700">
            {`'${currentStatus}' → should be '${expectedStatus}'`}
          </span>
        </div>
      )}
      
  <div className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2 mb-2">{task.content}</div>
      
      {(task.taskMetadata?.roi !== undefined && isFinite(task.taskMetadata.roi)) && (
        <div className={`text-xs font-medium mb-2 ${
          (task.taskMetadata?.roi || 0) > 0 ? 'text-green-600' : 'text-gray-500'
        }`}>
          ROI: {formatROI(task.taskMetadata?.roi)}
        </div>
      )}
      
  <div className="flex items-center gap-2 text-xs">
        {task.taskMetadata?.dueDate && (
          <span className={`px-1.5 py-0.5 rounded ${
            new Date(task.taskMetadata.dueDate) < new Date(Date.now() + 86400000) ? 'bg-red-100 text-red-600' :
            new Date(task.taskMetadata.dueDate) < new Date(Date.now() + 259200000) ? 'bg-yellow-100 text-yellow-600' :
    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
          }`}>
            {formatDueDate(task.taskMetadata.dueDate)}
          </span>
        )}
        {task.taskMetadata?.company && (
      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 rounded">
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
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">{task.content}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[task.taskMetadata?.status || 'someday']}`}>
          {task.taskMetadata?.status || 'someday'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
        {formatROI(task.taskMetadata?.roi)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
        {task.taskMetadata?.value ? formatValue(task.taskMetadata.value) : '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
        {task.taskMetadata?.effort ? formatEffort(task.taskMetadata.effort) : '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
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
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{task.content}</span>
            {urgency && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                urgency === 'urgent' ? 'bg-red-100 text-red-700' :
                urgency === 'soon' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
              }`}>
                {urgency}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
            {task.taskMetadata?.value && <span>💰 {formatValue(task.taskMetadata.value)}</span>}
            {task.taskMetadata?.effort && <span>⏱️ {formatEffort(task.taskMetadata.effort)}</span>}
            {task.taskMetadata?.dueDate && <span>📅 {formatDueDate(task.taskMetadata.dueDate)}</span>}
          </div>
        </div>
        
        {task.taskMetadata?.roi && task.taskMetadata.roi > 0 && (
          <div className="text-right">
            <div className="text-lg font-bold text-green-600">
              {formatROI(task.taskMetadata?.roi).replace('/mo', '')}
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
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{task.content}</div>
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