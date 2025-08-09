'use client';

import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, getTaskUrgency, canMoveToNext, TASK_RULES } from '@/types/task';
import { formatValue, formatEffort, formatDueDate } from '@/utils/smartTokenParser';
import { useAuth } from '@/contexts/AuthContext';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { AIChat } from '@/components/ai/AIChat';

type ViewMode = 'board' | 'table' | 'priority' | 'roi';

export function SmartView() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;

    const tasksRef = collection(db, 'users', user.uid, 'tasks');
    
    const unsubscribe = onSnapshot(tasksRef, (snapshot) => {
      const taskList: Task[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Calculate ROI with defaults for missing data
        const value = data.value || 0;
        const effort = data.effort || 1;
        const probability = data.probability || 1;
        
        let roi = 0;
        if (value > 0 && effort > 0) {
          roi = (value * probability) / effort;
        } else if (value > 0) {
          roi = (value * probability) / 0.1;
        }
        
        const task = {
          id: doc.id,
          ...data,
          roi: isFinite(roi) && roi > 0 ? roi : 0
        } as Task;
        taskList.push(task);
      });

      setTasks(taskList);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
    setMoveError(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverStatus(null);
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOverStatus(status);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverStatus(null);
    
    if (!draggedTask || !user || draggedTask.status === newStatus) {
      setDraggedTask(null);
      return;
    }

    if (newStatus === 'next') {
      const currentWipCount = tasks.filter(t => t.status === 'next' && t.id !== draggedTask.id).length;
      const validation = canMoveToNext(draggedTask, currentWipCount);
      
      if (!validation.allowed) {
        setMoveError(validation.reasons.join(', '));
        setTimeout(() => setMoveError(null), 3000);
        setDraggedTask(null);
        return;
      }
    }

    try {
      const taskRef = doc(db, 'users', user.uid, 'tasks', draggedTask.id);
      await updateDoc(taskRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating task:', error);
      setMoveError('Failed to move task');
      setTimeout(() => setMoveError(null), 3000);
    }

    setDraggedTask(null);
  };

  if (loading) {
    return <div className="p-6 text-gray-500">Loading smart view...</div>;
  }

  // Group tasks by status for board view
  const tasksByStatus = tasks.reduce((acc, task) => {
    const status = task.status || 'backlog';
    if (!acc[status]) acc[status] = [];
    acc[status].push(task);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  // Sort tasks by ROI for priority/ROI views
  const sortedByROI = [...tasks].sort((a, b) => (b.roi || 0) - (a.roi || 0));

  // Filter high-ROI and missing data tasks
  const highROITasks = sortedByROI.filter(task => task.roi && task.roi > 0).slice(0, 10);
  const missingDataTasks = tasks.filter(task => !task.value || !task.effort);

  const renderBoardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {(['backlog', 'next', 'doing', 'done'] as TaskStatus[]).map((status) => (
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

  const renderAIChat = () => (
    <AIChat 
      tasks={tasks}
      currentView={viewMode}
      selectedTasks={selectedTasks}
    />
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
          <button
            onClick={() => setViewMode('roi')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'roi' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🤖 AI Chat
          </button>
        </div>
      </div>

      {viewMode === 'board' && renderBoardView()}
      {viewMode === 'table' && renderTableView()}
      {viewMode === 'priority' && renderPriorityView()}
      {viewMode === 'roi' && renderAIChat()}
    </div>
  );
}

// Helper Components
function TaskColumn({ status, tasks, dragEnabled = true }: {
  status: TaskStatus;
  tasks: Task[];
  dragEnabled?: boolean;
}) {
  const statusConfig = {
    backlog: { title: '📥 Backlog', color: 'bg-gray-50' },
    next: { title: '⏭️ Next', color: 'bg-blue-50' },
    doing: { title: '🔄 Doing', color: 'bg-yellow-50' },
    done: { title: '✅ Done', color: 'bg-green-50' }
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
  task: Task;
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
      
      {(task.roi !== undefined && isFinite(task.roi)) && (
        <div className={`text-xs font-medium mb-2 ${
          task.roi > 0 ? 'text-green-600' : 'text-gray-500'
        }`}>
          ROI: {task.roi > 0 ? `$${Math.round(task.roi).toLocaleString()}/h` : 'Incomplete'}
        </div>
      )}
      
      <div className="flex items-center gap-2 text-xs">
        {task.dueDate && (
          <span className={`px-1.5 py-0.5 rounded ${
            getTaskUrgency(task) === 'urgent' ? 'bg-red-100 text-red-600' :
            getTaskUrgency(task) === 'soon' ? 'bg-yellow-100 text-yellow-600' :
            'bg-gray-100 text-gray-600'
          }`}>
            {formatDueDate(task.dueDate)}
          </span>
        )}
        {task.company && (
          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded">
            {task.company}
          </span>
        )}
      </div>
    </div>
  );
}

function TaskTableRow({ task }: { task: Task }) {
  const statusColors = {
    backlog: 'bg-gray-100 text-gray-700',
    next: 'bg-blue-100 text-blue-700',
    doing: 'bg-yellow-100 text-yellow-700',
    done: 'bg-green-100 text-green-700'
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900 line-clamp-2">{task.content}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[task.status || 'backlog']}`}>
          {task.status || 'backlog'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {task.roi && task.roi > 0 ? `$${Math.round(task.roi).toLocaleString()}/h` : '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {task.value ? formatValue(task.value) : '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {task.effort ? formatEffort(task.effort) : '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {task.dueDate ? formatDueDate(task.dueDate) : '-'}
      </td>
    </tr>
  );
}

function TaskPriorityRow({ task }: { task: Task }) {
  const urgency = getTaskUrgency(task);
  
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
            {task.value && <span>💰 {formatValue(task.value)}</span>}
            {task.effort && <span>⏱️ {formatEffort(task.effort)}</span>}
            {task.dueDate && <span>📅 {formatDueDate(task.dueDate)}</span>}
          </div>
        </div>
        
        {task.roi && task.roi > 0 && (
          <div className="text-right">
            <div className="text-lg font-bold text-green-600">
              ${Math.round(task.roi).toLocaleString()}/h
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskMissingDataRow({ task }: { task: Task }) {
  const missingFields = [];
  if (!task.value) missingFields.push('Value');
  if (!task.effort) missingFields.push('Effort');
  if (!task.probability) missingFields.push('Probability');

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