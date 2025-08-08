// Task management types for decision-first to-do system

export type TaskSection = 'Capture' | '2mins' | 'NextStep' | 'Delegate' | 'Pending' | 'Later' | 'Done';

export interface TaskToken {
  netValue?: number;        // #15M → 15
  effort?: number;          // ~3h → 3  
  due?: Date;              // >today|tomorrow|2025-08-21 → parsed date
  probability?: number;     // %0.6 → 0.6
  assignee?: string;       // @handle
  project?: string;        // :AIC|:WN|:BXV|:EA|:PERSONAL
}

export interface Task {
  id: string;
  blockId: string;          // Source block ID for mirror
  userId: string;           // Owner
  pageId: string;           // Parent page
  
  // Content
  content: string;          // Display text (tokens stripped)
  rawContent: string;       // Original text with tokens
  
  // Parsed tokens
  netValue?: number;        // Monetary value in millions
  effort?: number;          // Time in hours
  due?: Date;              // Due date
  probability?: number;     // Success probability (0-1)
  assignee?: string;       // Who should do it
  project?: string;        // Project code
  
  // Computed fields (server-only)
  roi?: number;            // Net Value / Effort (server computed)
  expectedValue?: number;   // Net Value * Probability
  
  // Workflow
  section: TaskSection;     // Current section
  subtasks: string[];       // Required for NextStep (≥1)
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  
  // Sync
  lastSyncedAt?: Date;      // Last mirror sync from block
}

export interface TaskStats {
  totalTasks: number;
  bySection: Record<TaskSection, number>;
  avgROI: number;
  missingData: {
    noNetValue: number;
    noEffort: number;
    noDue: number;
  };
  nextStepCount: number;    // Should be ≤ 3
}

export interface TaskMoveRequest {
  taskId: string;
  fromSection: TaskSection;
  toSection: TaskSection;
  // Required for NextStep moves
  due?: Date;
  subtasks?: string[];
}

export interface ROICalculation {
  taskId: string;
  netValue: number;
  effort: number;
  probability: number;
  roi: number;              // netValue / effort
  expectedValue: number;    // netValue * probability
  calculatedAt: Date;
}

// Token parsing results
export interface ParsedTokens {
  cleanContent: string;     // Text with tokens removed
  tokens: TaskToken;        // Extracted token values
  errors: string[];         // Parsing errors
}

// Board column configuration
export interface BoardColumn {
  id: TaskSection;
  title: string;
  maxItems?: number;        // WIP limit for NextStep = 3
  color: string;
  description: string;
}

// 48-hour report data
export interface StatusReport {
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    dueSoon: Task[];          // Due within 48h
    nextStepTasks: Task[];    // All NextStep tasks
    delegateQueue: Task[];    // All Delegate tasks
    topROI: Task[];          // Top 5 ROI tasks
  };
  stats: TaskStats;
  markdown: string;         // Formatted report
}

// AI assistance types (optional)
export interface AIEstimate {
  taskContent: string;
  suggestedNetValue?: number;
  suggestedEffort?: number;
  suggestedSubtasks?: string[];
  confidence: number;       // 0-1
  reasoning: string;
}

export interface AIRequest {
  content: string;
  context?: {
    project?: string;
    relatedTasks?: Task[];
  };
}

export interface AIResponse {
  estimates: AIEstimate;
  error?: string;
}
