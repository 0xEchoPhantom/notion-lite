import { useState, useEffect, useCallback } from 'react';
import { Block } from '@/types';
import { Task, TaskSection, ParsedTokens } from '@/types/task';
import { parseTaskTokens, hasTaskTokens, calculateROI } from '@/utils/tokenParser';
import { useAuth } from '@/contexts/AuthContext';

interface TaskMirrorState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  stats: {
    total: number;
    withROI: number;
    missingData: number;
  };
}

/**
 * Hook to mirror blocks into tasks automatically
 * Implements "soft capture, hard record" philosophy
 */
export function useTaskMirror(pageId?: string) {
  const { user } = useAuth();
  const [state, setState] = useState<TaskMirrorState>({
    tasks: [],
    loading: false,
    error: null,
    stats: { total: 0, withROI: 0, missingData: 0 }
  });

  /**
   * Convert a block to a task if it contains task tokens
   */
  const blockToTask = useCallback((block: Block): Task | null => {
    if (!user || !block.content || block.type !== 'todo-list') {
      return null;
    }

    // Only create tasks for blocks with task tokens
    if (!hasTaskTokens(block.content)) {
      return null;
    }

    const parsed = parseTaskTokens(block.content);
    const roi = calculateROI(parsed.tokens);

    const task: Task = {
      id: `task_${block.id}`,
      blockId: block.id,
      userId: user.uid,
      pageId: pageId || 'unknown',
      
      content: parsed.cleanContent,
      rawContent: block.content,
      
      // Parsed tokens
      netValue: parsed.tokens.netValue,
      effort: parsed.tokens.effort,
      due: parsed.tokens.due,
      probability: parsed.tokens.probability || 0.8, // Default 80%
      assignee: parsed.tokens.assignee,
      project: parsed.tokens.project,
      
      // Computed fields
      roi: roi || undefined,
      expectedValue: roi && parsed.tokens.probability ? roi * parsed.tokens.probability : undefined,
      
      // Workflow - default to Later, user can move to other sections
      section: 'Later' as TaskSection,
      subtasks: [],
      
      // Metadata
      createdAt: block.createdAt instanceof Date ? block.createdAt : 
                 (block.createdAt && typeof block.createdAt === 'object' && 'seconds' in block.createdAt) 
                   ? new Date(block.createdAt.seconds * 1000) 
                   : new Date(),
      updatedAt: block.updatedAt instanceof Date ? block.updatedAt :
                 (block.updatedAt && typeof block.updatedAt === 'object' && 'seconds' in block.updatedAt) 
                   ? new Date(block.updatedAt.seconds * 1000) 
                   : new Date(),
      
      lastSyncedAt: new Date()
    };

    return task;
  }, [user, pageId]);

  /**
   * Mirror blocks to tasks
   */
  const mirrorBlocks = useCallback(async (blocks: Block[]) => {
    if (!user) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const tasks: Task[] = [];
      
      for (const block of blocks) {
        const task = blockToTask(block);
        if (task) {
          tasks.push(task);
        }
      }

      // Calculate stats
      const total = tasks.length;
      const withROI = tasks.filter(t => t.roi !== null && t.roi !== undefined).length;
      const missingData = tasks.filter(t => !t.netValue || !t.effort).length;

      setState({
        tasks,
        loading: false,
        error: null,
        stats: { total, withROI, missingData }
      });

      console.log(`🔄 Mirrored ${total} tasks from ${blocks.length} blocks`);
      
    } catch (error) {
      console.error('Task mirror error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [user, blockToTask]);

  /**
   * Get tasks by section
   */
  const getTasksBySection = useCallback((section: TaskSection): Task[] => {
    return state.tasks.filter(task => task.section === section);
  }, [state.tasks]);

  /**
   * Get top ROI tasks
   */
  const getTopROITasks = useCallback((limit: number = 10): Task[] => {
    return state.tasks
      .filter(task => task.roi !== null && task.roi !== undefined)
      .sort((a, b) => (b.roi || 0) - (a.roi || 0))
      .slice(0, limit);
  }, [state.tasks]);

  /**
   * Get tasks missing data
   */
  const getMissingDataTasks = useCallback((): Task[] => {
    return state.tasks.filter(task => !task.netValue || !task.effort);
  }, [state.tasks]);

  /**
   * Move task to different section (with validation)
   */
  const moveTask = useCallback(async (taskId: string, toSection: TaskSection): Promise<boolean> => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return false;

    // Validate NextStep requirements
    if (toSection === 'NextStep') {
      const nextStepTasks = getTasksBySection('NextStep');
      
      // Check WIP limit
      if (nextStepTasks.length >= 3) {
        setState(prev => ({ 
          ...prev, 
          error: 'Next Step is limited to 3 tasks maximum (WIP limit)' 
        }));
        return false;
      }
      
      // Check requirements: due date and at least 1 subtask
      if (!task.due) {
        setState(prev => ({ 
          ...prev, 
          error: 'Task must have a due date to move to Next Step' 
        }));
        return false;
      }
      
      if (task.subtasks.length === 0) {
        setState(prev => ({ 
          ...prev, 
          error: 'Task must have at least 1 subtask to move to Next Step' 
        }));
        return false;
      }
    }

    // Update task section
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => 
        t.id === taskId 
          ? { ...t, section: toSection, updatedAt: new Date() }
          : t
      ),
      error: null
    }));

    console.log(`📋 Moved task ${taskId} to ${toSection}`);
    return true;
  }, [state.tasks, getTasksBySection]);

  /**
   * Update task data (for inline editing)
   */
  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => {
        if (t.id !== taskId) return t;
        
        const updatedTask = { ...t, ...updates, updatedAt: new Date() };
        
        // Recalculate ROI if netValue or effort changed
        if (updates.netValue !== undefined || updates.effort !== undefined) {
          const roiResult = calculateROI({ 
            netValue: updates.netValue ?? t.netValue,
            effort: updates.effort ?? t.effort 
          });
          updatedTask.roi = roiResult || undefined;
        }
        
        return updatedTask;
      })
    }));
  }, []);

  return {
    ...state,
    mirrorBlocks,
    getTasksBySection,
    getTopROITasks,
    getMissingDataTasks,
    moveTask,
    updateTask
  };
}
