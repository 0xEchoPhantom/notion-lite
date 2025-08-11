'use client';

import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, getTaskUrgency, canMoveToNext } from '@/types/task';
import { formatValue, formatEffort, formatDueDate } from '@/utils/smartTokenParser';
import { useAuth } from '@/contexts/AuthContext';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '@/firebase/client';

// Top ROI View Component
export function TopROIView() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const tasksRef = collection(db, 'users', user.uid, 'tasks');
    
    // Can't use multiple != filters, so just get all tasks and filter client-side
    const unsubscribe = onSnapshot(tasksRef, (snapshot) => {
      const taskList: Task[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Calculate ROI with defaults for missing data
        const value = data.value || 0;
        const effort = data.effort || 1; // Default to 1 hour if no effort specified
        // Calculate ROI even with partial data
        let roi = 0;
        if (value > 0 && effort > 0) {
          roi = value / effort;
        } else if (value > 0) {
          // If only value is specified, assume minimal effort (0.1h)
          roi = value / 0.1;
        }
        
        // Include task if it has any meaningful data
        if (value > 0 || effort > 0 || data.content) {
          const task = {
            id: doc.id,
            ...data,
            roi: isFinite(roi) && roi > 0 ? roi : 0
          } as Task;
          taskList.push(task);
        }
      });

      // Sort by ROI
      taskList.sort((a, b) => (b.roi || 0) - (a.roi || 0));
      setTasks(taskList.slice(0, 10)); // Top 10
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  if (loading) {
    return <div className="p-4 text-gray-500">Loading top ROI tasks...</div>;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">💰 Top ROI Tasks</h3>
        <p className="text-sm text-gray-500 mt-1">Highest return on investment</p>
      </div>
      
      <div className="divide-y divide-gray-100">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskROIRow key={task.id} task={task} />
          ))
        ) : (
          <div className="p-4 text-center text-gray-500">
            No tasks with value and effort data
          </div>
        )}
      </div>
    </div>
  );
}

// Missing Data View Component
export function MissingDataView() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const tasksRef = collection(db, 'users', user.uid, 'tasks');
    const unsubscribe = onSnapshot(tasksRef, (snapshot) => {
      const taskList: Task[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Filter for tasks missing value or effort
        if (!data.value || !data.effort) {
          taskList.push({
            id: doc.id,
            ...data
          } as Task);
        }
      });
      
      setTasks(taskList);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  if (loading) {
    return <div className="p-4 text-gray-500">Loading incomplete tasks...</div>;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">📊 Missing Data</h3>
        <p className="text-sm text-gray-500 mt-1">Tasks needing value or effort estimates</p>
      </div>
      
      <div className="divide-y divide-gray-100">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskMissingDataRow key={task.id} task={task} />
          ))
        ) : (
          <div className="p-4 text-center text-gray-500">
            All tasks have complete data! 🎉
          </div>
        )}
      </div>
    </div>
  );
}

// Task Board View Component
export function TaskBoardView() {
  const { user } = useAuth();
  const [tasksByStatus, setTasksByStatus] = useState<Record<TaskStatus, Task[]>>({
    'now': [],
    'next': [],
    'waiting': [],
    'someday': [],
    'done': []
  });
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const tasksRef = collection(db, 'users', user.uid, 'tasks');
    const unsubscribe = onSnapshot(tasksRef, (snapshot) => {
      const statuses: Record<TaskStatus, Task[]> = {
        'now': [],
        'next': [],
        'waiting': [],
        'someday': [],
        'done': []
      };

      snapshot.forEach((doc) => {
        const data = doc.data();
        const task = {
          id: doc.id,
          ...data,
          roi: data.value && data.effort ? 
            data.value / data.effort : null
        } as Task;
        
        if (statuses[task.status]) {
          statuses[task.status].push(task);
        }
      });

      // Sort each status by ROI
      Object.keys(statuses).forEach((status) => {
        statuses[status as TaskStatus].sort((a, b) => (b.roi || 0) - (a.roi || 0));
      });

      setTasksByStatus(statuses);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  if (loading) {
    return <div className="p-4 text-gray-500">Loading task board...</div>;
  }

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
    setMoveError(null);
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

    // Validate move to 'next' status
    if (newStatus === 'next') {
      // Check WIP limit
      const currentWipCount = tasksByStatus['next'].filter(t => t.id !== draggedTask.id).length;
      const validation = canMoveToNext(draggedTask, currentWipCount);
      
      if (!validation.allowed) {
        setMoveError(validation.reasons.join(', '));
        setTimeout(() => setMoveError(null), 3000);
        setDraggedTask(null);
        return;
      }
    }

    try {
      // Update task status in Firestore
      const taskRef = doc(db, 'users', user.uid, 'tasks', draggedTask.id);
      await updateDoc(taskRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
        ...(newStatus === 'next' && { promotedToNextAt: serverTimestamp() })
      });
      
      // Log event
      const eventsRef = collection(db, 'users', user.uid, 'taskEvents');
      await addDoc(eventsRef, {
        taskId: draggedTask.id,
        type: 'promoted',
        fromStatus: draggedTask.status,
        toStatus: newStatus,
        timestamp: serverTimestamp()
      });
      
      // Show success feedback  
      setMoveError(`✅ Moved to ${newStatus}`);
      setTimeout(() => setMoveError(null), 2000);
    } catch (error) {
      console.error('Error moving task:', error);
      setMoveError('Failed to move task');
      setTimeout(() => setMoveError(null), 3000);
    }
    
    setDraggedTask(null);
  };

  return (
    <div>
      {moveError && (
        <div className={`mx-4 mb-4 p-3 rounded-lg text-sm ${
          moveError.startsWith('✅') 
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {moveError}
        </div>
      )}
      <div className="grid grid-cols-5 gap-4 p-4">
        {(['now', 'next', 'waiting', 'someday', 'done'] as TaskStatus[]).map((status) => (
          <TaskColumn 
            key={status} 
            status={status} 
            tasks={tasksByStatus[status]}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            isDraggedOver={dragOverStatus === status}
            draggedTask={draggedTask}
          />
        ))}
      </div>
    </div>
  );
}

// Individual Task Row Components
function TaskROIRow({ task }: { task: Task }) {
  const urgency = getTaskUrgency(task);
  
  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
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
            {task.value && (
              <span className="flex items-center gap-1">
                <span className="text-green-600">💵</span>
                {formatValue(task.value)}
              </span>
            )}
            {task.effort && (
              <span className="flex items-center gap-1">
                <span>⏱️</span>
                {formatEffort(task.effort)}
              </span>
            )}
            {task.dueDate && (
              <span className="flex items-center gap-1">
                <span>📅</span>
                {formatDueDate(task.dueDate)}
              </span>
            )}
          </div>
        </div>
        
        {task.roi && (
          <div className="text-right">
            <div className="text-lg font-bold text-green-600">
              ${Math.round(task.roi).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">per hour</div>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskMissingDataRow({ task }: { task: Task }) {
  const missingFields = [];
  if (!task.value) missingFields.push('value');
  if (!task.effort) missingFields.push('effort');
  if (!task.dueDate) missingFields.push('due date');
  
  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900">{task.content}</div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500">Missing:</span>
            {missingFields.map((field) => (
              <span 
                key={field}
                className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full"
              >
                {field}
              </span>
            ))}
          </div>
        </div>
        
        <button className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors">
          Add data
        </button>
      </div>
    </div>
  );
}

interface TaskColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onDragStart?: (task: Task) => void;
  onDragOver?: (e: React.DragEvent, status: TaskStatus) => void;
  onDrop?: (e: React.DragEvent, status: TaskStatus) => void;
  isDraggedOver?: boolean;
  draggedTask?: Task | null;
}

function TaskColumn({ 
  status, 
  tasks, 
  onDragStart, 
  onDragOver, 
  onDrop,
  isDraggedOver = false,
  draggedTask
}: TaskColumnProps) {
  const statusConfig = {
    'now': { title: 'Now', emoji: '⚡', color: 'blue', limit: null },
    'next': { title: 'Next', emoji: '🎯', color: 'green', limit: 3 },
    'waiting': { title: 'Waiting', emoji: '⏳', color: 'purple', limit: null },
    'someday': { title: 'Someday', emoji: '💭', color: 'gray', limit: null },
    'done': { title: 'Done', emoji: '✅', color: 'emerald', limit: null }
  };
  
  const config = statusConfig[status];
  const isOverLimit = config.limit !== null && tasks.length > config.limit;
  
  return (
    <div 
      className={`bg-white rounded-lg border-2 transition-all ${
        isDraggedOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
      }`}
      onDragOver={(e) => onDragOver?.(e, status)}
      onDrop={(e) => onDrop?.(e, status)}
      onDragLeave={(e) => {
        // Only clear if we're leaving the entire column
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          // Optional: clear drag over state
        }
      }}
    >
      <div className={`p-3 border-b border-gray-200 bg-${config.color}-50`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{config.emoji}</span>
            <h3 className="font-medium text-gray-900">{config.title}</h3>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            isOverLimit ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
          }`}>
            {tasks.length}
            {config.limit !== null && ` / ${config.limit}`}
          </span>
        </div>
        {status === 'next' && isOverLimit && (
          <div className="mt-2 text-xs text-red-600">
            WIP limit exceeded!
          </div>
        )}
      </div>
      
      <div className="divide-y divide-gray-100 min-h-[100px] max-h-96 overflow-y-auto">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onDragStart={onDragStart}
              isDragging={draggedTask?.id === task.id}
            />
          ))
        ) : (
          <div className="p-4 text-center text-xs text-gray-400">
            {isDraggedOver ? 'Drop here' : 'No tasks'}
          </div>
        )}
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onDragStart?: (task: Task) => void;
  isDragging?: boolean;
}

function TaskCard({ task, onDragStart, isDragging = false }: TaskCardProps) {
  return (
    <div 
      className={`p-3 hover:bg-gray-50 transition-all cursor-move ${
        isDragging ? 'opacity-50' : ''
      }`}
      draggable
      onDragStart={(e) => {
        onDragStart?.(task);
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      <div className="text-sm text-gray-900 line-clamp-2">{task.content}</div>
      
      {(task.roi !== undefined && isFinite(task.roi)) && (
        <div className={`mt-1 text-xs font-medium ${
          task.roi > 0 ? 'text-green-600' : 'text-gray-500'
        }`}>
          ROI: {task.roi > 0 ? `$${Math.round(task.roi).toLocaleString()}/h` : 'No value/effort'}
        </div>
      )}
      
      <div className="flex items-center gap-2 mt-2">
        {task.dueDate && (
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            getTaskUrgency(task) === 'urgent' ? 'bg-red-100 text-red-600' :
            getTaskUrgency(task) === 'soon' ? 'bg-yellow-100 text-yellow-600' :
            'bg-gray-100 text-gray-600'
          }`}>
            {formatDueDate(task.dueDate)}
          </span>
        )}
        {task.company && (
          <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded">
            {task.company}
          </span>
        )}
      </div>
    </div>
  );
}