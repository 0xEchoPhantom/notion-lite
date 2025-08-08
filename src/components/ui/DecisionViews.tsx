'use client';

import React, { useState } from 'react';
import { Task, TaskSection } from '@/types/task';

interface DecisionViewsProps {
  tasks: Task[];
  onMoveTask: (taskId: string, toSection: TaskSection) => Promise<boolean>;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
}

export const DecisionViews: React.FC<DecisionViewsProps> = ({
  tasks,
  onMoveTask,
  onUpdateTask
}) => {
  const [activeView, setActiveView] = useState<'roi' | 'missing' | 'board'>('roi');
  const [loading, setLoading] = useState(false);

  // Get top ROI tasks
  const topROITasks = tasks
    .filter(task => task.roi !== undefined && task.roi !== null)
    .sort((a, b) => (b.roi || 0) - (a.roi || 0))
    .slice(0, 10);

  // Get missing data tasks
  const missingDataTasks = tasks.filter(task => !task.netValue || !task.effort);

  // Get tasks by section for board view
  const getTasksBySection = (section: TaskSection) => 
    tasks.filter(task => task.section === section);

  // Board columns configuration
  const boardColumns: Array<{id: TaskSection, title: string, maxItems?: number, color: string}> = [
    { id: 'Capture', title: 'Capture', color: 'bg-red-100 border-red-200' },
    { id: '2mins', title: '2 Minutes', color: 'bg-orange-100 border-orange-200' },
    { id: 'NextStep', title: 'Next Step', maxItems: 3, color: 'bg-green-100 border-green-200' },
    { id: 'Delegate', title: 'Delegate', color: 'bg-yellow-100 border-yellow-200' },
    { id: 'Pending', title: 'Pending', color: 'bg-purple-100 border-purple-200' },
    { id: 'Later', title: 'Later', color: 'bg-gray-100 border-gray-200' },
    { id: 'Done', title: 'Done', color: 'bg-gray-100 border-gray-300' },
  ];

  const handleMoveTask = async (taskId: string, toSection: TaskSection) => {
    setLoading(true);
    const success = await onMoveTask(taskId, toSection);
    if (!success) {
      // Error handling is done in the hook
    }
    setLoading(false);
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

  const TaskCard: React.FC<{task: Task}> = ({ task }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium text-gray-900 flex-1">{task.content}</h3>
        {task.roi !== undefined && (
          <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-medium">
            ROI: {task.roi.toFixed(2)}
          </span>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2 text-xs">
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
      
      <div className="mt-3 flex gap-2">
        {task.section !== 'NextStep' && (
          <button
            onClick={() => handleMoveTask(task.id, 'NextStep')}
            disabled={loading}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            → Next Step
          </button>
        )}
        {task.section !== 'Done' && (
          <button
            onClick={() => handleMoveTask(task.id, 'Done')}
            disabled={loading}
            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            ✓ Done
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* View Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'roi', label: '💰 Top ROI', count: topROITasks.length },
          { id: 'missing', label: '❓ Missing Data', count: missingDataTasks.length },
          { id: 'board', label: '📋 Board', count: tasks.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id as any)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeView === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Top ROI View */}
      {activeView === 'roi' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Top ROI Tasks
          </h2>
          
          {topROITasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No tasks with calculated ROI yet.</p>
              <p className="text-sm mt-2">Add Net Value (#5M) and Effort (~2h) to your tasks.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topROITasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Missing Data View */}
      {activeView === 'missing' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Tasks Missing Critical Data
          </h2>
          
          {missingDataTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>🎉 All tasks have complete data!</p>
              <p className="text-sm mt-2">Every task has Net Value and Effort specified.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {missingDataTasks.map(task => (
                <div key={task.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900">{task.content}</h3>
                    <div className="flex gap-1">
                      {!task.netValue && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                          No Value
                        </span>
                      )}
                      {!task.effort && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                          No Effort
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">
                    Add missing data: {!task.netValue && 'Net Value (#5M)'} {!task.netValue && !task.effort && ', '} {!task.effort && 'Effort (~2h)'}
                  </p>
                  
                  <button
                    onClick={() => {
                      // For demo, just update with sample values
                      onUpdateTask(task.id, {
                        netValue: task.netValue || 1,
                        effort: task.effort || 1
                      });
                    }}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Add Sample Data
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Board View */}
      {activeView === 'board' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Task Board
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {boardColumns.map(column => {
              const columnTasks = getTasksBySection(column.id);
              const isWIPLimited = column.maxItems && columnTasks.length >= column.maxItems;
              
              return (
                <div key={column.id} className={`${column.color} border rounded-lg p-4`}>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium text-gray-900">{column.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${
                      isWIPLimited ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {columnTasks.length}
                      {column.maxItems && `/${column.maxItems}`}
                    </span>
                  </div>
                  
                  {column.maxItems && isWIPLimited && (
                    <div className="mb-3 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-800">
                      WIP Limit Reached!
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    {columnTasks.map(task => (
                      <div key={task.id} className="bg-white border rounded p-3 text-sm">
                        <div className="font-medium text-gray-900 mb-1">{task.content}</div>
                        {task.roi !== undefined && (
                          <div className="text-xs text-green-600">ROI: {task.roi.toFixed(2)}</div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {columnTasks.length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      No tasks
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
