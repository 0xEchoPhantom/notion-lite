// Task mirror types for decision-first to-do system

export type TaskStatus = 'now' | 'next' | 'waiting' | 'someday' | 'done';
export type TaskCompany = 'AIC' | 'WN' | 'BXV' | 'EA' | 'PERSONAL';

export interface Task {
  // Core identifiers
  id: string;
  blockId: string; // Reference to source block
  pageId: string;
  userId: string;
  
  // Content
  content: string; // Clean text without tokens
  rawContent: string; // Original text with tokens
  
  // Decision metrics
  value?: number; // Dollar value (e.g., 15000000 for $15M)
  effort?: number; // Hours (e.g., 3 for 3h)
  probability?: number; // 0-1 (e.g., 0.6 for 60%)
  roi?: number; // Server-computed: (value * probability) / effort
  
  // Task metadata
  status: TaskStatus;
  company?: TaskCompany;
  dueDate?: Date;
  assignee?: string;
  tags?: string[]; // Additional tags
  
  // Hierarchy
  parentTaskId?: string;
  subtaskIds: string[];
  
  // State
  isCompleted: boolean;
  completedAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  promotedToNextAt?: Date;
}

export interface TaskToken {
  type: 'value' | 'effort' | 'due' | 'probability' | 'assignee' | 'company' | 'tag';
  raw: string; // Original token string (e.g., '@15M', '@3h')
  value: any; // Parsed value
  position: {
    start: number;
    end: number;
  };
}

export interface TaskEvent {
  id: string;
  taskId: string;
  userId: string;
  type: 'created' | 'promoted' | 'completed' | 'updated';
  fromStatus?: TaskStatus;
  toStatus?: TaskStatus;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  tasksWithValue: number;
  tasksWithEffort: number;
  tasksByStatus: Record<TaskStatus, number>;
  wipCount: number; // Current WIP in 'next' status
  topROI: Task[];
  missingData: Task[];
}

// Validation rules
export const TASK_RULES = {
  MAX_WIP: 3,
  STATUSES: ['now', 'next', 'waiting', 'someday', 'done'] as TaskStatus[],
  COMPANIES: ['AIC', 'WN', 'BXV', 'EA', 'PERSONAL'] as TaskCompany[],
  
  // Single @ pattern for all tokens
  TOKEN_PATTERN: /@([\w\.:-]+(?:\s+[\w\.:-]+)*)/gi,
  
  // Conversion factors
  VALUE_MULTIPLIERS: {
    K: 1000,
    M: 1000000,
    B: 1000000000
  },
  
  EFFORT_MULTIPLIERS: {
    h: 1, // hours as base unit
    d: 8, // 8 hours per day
    w: 40, // 40 hours per week
    m: 160 // 160 hours per month
  }
} as const;

// Helper functions
export function canMoveToNext(task: Task, currentWipCount: number): {
  allowed: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  
  if (!task.dueDate) {
    reasons.push('Task must have a due date');
  }
  
  if (task.subtaskIds.length === 0) {
    reasons.push('Task must have at least 1 subtask');
  }
  
  if (currentWipCount >= TASK_RULES.MAX_WIP) {
    reasons.push(`WIP limit reached (${TASK_RULES.MAX_WIP} tasks max)`);
  }
  
  return {
    allowed: reasons.length === 0,
    reasons
  };
}

export function calculateROI(task: Task): number | null {
  if (!task.value || !task.effort) return null;
  
  const probability = task.probability ?? 1;
  return (task.value * probability) / task.effort;
}

export function isHighROITask(task: Task): boolean {
  const roi = calculateROI(task);
  return roi !== null && roi > 1000; // $1000+ per hour
}

export function getTaskUrgency(task: Task): 'urgent' | 'soon' | 'normal' | null {
  if (!task.dueDate) return null;
  
  const now = new Date();
  const due = new Date(task.dueDate);
  const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursUntilDue < 24) return 'urgent';
  if (hoursUntilDue < 48) return 'soon';
  return 'normal';
}