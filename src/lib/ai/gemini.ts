import { getAI, getGenerativeModel, VertexAIBackend } from '@firebase/ai';
import { Task } from '@/types/task';
import app from '@/firebase/client';

// Initialize Firebase AI Logic with Vertex AI backend
console.log('Initializing Firebase Vertex AI...');
console.log('Firebase app project ID:', app.options.projectId);

// Configure backend (explicit location) and allow model override via env
const LOCATION = process.env.NEXT_PUBLIC_FIREBASE_AI_LOCATION || 'us-central1';
const PRIMARY_MODEL = process.env.NEXT_PUBLIC_FIREBASE_AI_MODEL || 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-2.0-flash-lite';

// Initialize the Vertex AI Gemini API backend service
const ai = getAI(app, { backend: new VertexAIBackend(LOCATION) });

// Create a GenerativeModel instance (prefer auto-updated model names per docs)
const model = getGenerativeModel(ai, {
  model: PRIMARY_MODEL,
  systemInstruction: `You are an expert task prioritization and productivity assistant. Your role is to help users make smart decisions about their tasks based on:

1. ROI (Return on Investment) - value divided by effort
2. Urgency - deadlines and time sensitivity  
3. Dependencies - what blocks other work
4. User goals - alignment with objectives

Always provide:
- Clear, actionable recommendations
- Reasoning behind suggestions
- Specific next steps
- Realistic time estimates

Keep responses concise but helpful. Focus on practical advice that leads to better productivity and decision-making.`
});

export interface ChatContext {
  tasks: Task[];
  currentView?: 'board' | 'table' | 'priority' | 'roi';
  selectedTasks?: string[];
  userQuery?: string;
}

export interface AIResponse {
  reply: string;
  suggestions?: ActionSuggestion[];
  taskUpdates?: TaskUpdate[];
}

export interface ActionSuggestion {
  type: 'prioritize' | 'estimate' | 'breakdown' | 'focus' | 'daily-plan' | 'weekly-review' | 'crisis' | 'delegate' | 'report' | 'procrastination' | 'time-audit';
  title: string;
  description: string;
  taskIds?: string[];
  action?: () => void;
}

export interface TaskUpdate {
  taskId: string;
  updates: Partial<Task>;
  reasoning: string;
}

export interface AIHistoryMessage {
  role: 'user' | 'model';
  content: string;
}

export class GeminiTaskAssistant {
  private model = model;
  
  // Predefined prompts for common use cases
  private readonly PROMPTS = {
    DAILY_PLAN: 'Create a time-blocked daily plan based on deadlines, ROI, and energy levels',
    WEEKLY_REVIEW: 'Run a comprehensive weekly review with metrics and recommendations',
    CRISIS_MODE: 'Help me triage - everything is urgent and I am overwhelmed',
    ROI_OPTIMIZE: 'Optimize my task list for maximum ROI per hour',
    SMART_CREATE: 'Parse natural language and create structured task with metadata',
    DELEGATION: 'Analyze which tasks I should delegate and to whom',
    STATUS_REPORT: 'Generate a professional status report for stakeholders',
    PROCRASTINATION: 'Help me overcome procrastination on specific tasks',
    TIME_AUDIT: 'Analyze where my time is going and suggest improvements',
    FOCUS_SESSION: 'Design a deep work session for maximum productivity'
  };

  async chatWithTasks(message: string, context: ChatContext): Promise<AIResponse> {
    try {
      // Check for special commands
      const response = await this.handleSpecialCommands(message, context);
      if (response) return response;
      
      const prompt = this.buildTaskAnalysisPrompt(message, context);
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      return this.parseAIResponse(text, context);
    } catch (error: unknown) {
      console.error('Firebase Vertex AI error:', error);

      // Retry once with fallback model if model is not found or access denied
  const msg = error instanceof Error ? String(error.message || '') : '';
      const shouldRetry = msg.includes('404') || msg.includes('was not found') || msg.toLowerCase().includes('permission') || msg.includes('403');
      if (shouldRetry) {
        try {
          const altModel = getGenerativeModel(ai, { model: FALLBACK_MODEL });
          const prompt = this.buildTaskAnalysisPrompt(message, context);
          const result = await altModel.generateContent(prompt);
          const text = result.response.text();
          return this.parseAIResponse(text, context);
  } catch (e) {
          // Fall through to guidance message
          console.warn('Fallback model also failed:', e);
        }
      }

      // Guidance for enabling Vertex AI
      return {
        reply: `⚠️ Vertex AI unavailable.

Try these steps and retry:
1) Enable Vertex AI API for project notion-lite-5a525: https://console.cloud.google.com/apis/library/aiplatform.googleapis.com?project=notion-lite-5a525
2) Ensure billing is enabled
3) Grant Vertex AI User role to the Firebase service account
4) Optionally set NEXT_PUBLIC_FIREBASE_AI_MODEL to '${PRIMARY_MODEL}' or '${FALLBACK_MODEL}'
5) Wait 2-3 minutes and try again`,
        suggestions: []
      };
    }
  }

  async chatWithHistory(history: AIHistoryMessage[], context: ChatContext): Promise<AIResponse> {
    try {
      // Get the last user message
      const lastUserMessage = history[history.length - 1];
      if (!lastUserMessage || lastUserMessage.role !== 'user') {
        return this.chatWithTasks('', context);
      }

      // Build task context for the current message
      const taskContext = this.buildTaskAnalysisPrompt(lastUserMessage.content, context);
      
      // Build structured contents from history, replacing last user message with context-enriched version
      const contents = history.slice(0, -1).map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));
      
      // Add the last user message with task context
      contents.push({
        role: 'user',
        parts: [{ text: taskContext }]
      });

      const result = await this.model.generateContent({ contents });
      const text = result.response.text();
      return this.parseAIResponse(text, context);
    } catch (error: unknown) {
      console.error('Firebase Vertex AI (history) error:', error);

      // Fallback to single-turn behavior if needed
      return this.chatWithTasks(history[history.length - 1]?.content || '', context);
    }
  }

  async analyzeTasks(tasks: Task[], analysisType: 'priority' | 'gaps' | 'optimization' | 'bottlenecks'): Promise<string> {
    try {
      const prompt = this.buildAnalysisPrompt(tasks, analysisType);
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Gemini analysis error:', error);
      return this.getFallbackAnalysis(tasks, analysisType);
    }
  }

  async suggestTaskBreakdown(task: Task): Promise<string[]> {
    try {
      const prompt = `Break down this task into smaller, manageable subtasks:

Task: "${task.content}"
Value: ${task.value ? `$${task.value}` : 'Not specified'}
Effort: ${task.effort ? `${task.effort}h` : 'Not specified'}
Due: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No deadline'}

Provide 3-5 specific, actionable subtasks. Format as a simple list.`;

      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      
      // Extract list items from response
      return text.split('\n')
        .filter(line => line.trim().match(/^[-*•]\s+|^\d+\.\s+/))
        .map(line => line.replace(/^[-*•]\s+|^\d+\.\s+/, '').trim())
        .filter(item => item.length > 0);
    } catch (error) {
      console.error('Gemini breakdown error:', error);
      return this.getFallbackBreakdown(task);
    }
  }

  async estimateTaskValue(taskContent: string, similarTasks: Task[]): Promise<{ value: number; effort: number; reasoning: string }> {
    try {
      const prompt = `Help estimate value and effort for this task:

Task: "${taskContent}"

Similar completed tasks for context:
${similarTasks.slice(0, 3).map(t => `- "${t.content}" (Value: $${t.value || 0}, Effort: ${t.effort || 0}h, ROI: $${Math.round(t.roi || 0)}/h)`).join('\n')}

Provide estimates in this exact format:
VALUE: [dollar amount]
EFFORT: [hours as decimal]
REASONING: [brief explanation]`;

      const result = await this.model.generateContent(prompt);
      const text = result.response.text();

      return this.parseEstimateResponse(text);
    } catch (error) {
      console.error('Gemini estimation error:', error);
      return {
        value: 1000,
        effort: 2,
        reasoning: 'Default estimate - please refine based on your experience'
      };
    }
  }

  private buildTaskAnalysisPrompt(message: string, context: ChatContext): string {
    const { tasks, currentView } = context;
    
    const taskSummary = this.summarizeTasks(tasks);
    const viewContext = currentView ? `User is currently viewing: ${currentView}` : '';

    return `${viewContext}

Current task situation:
${taskSummary}

User question: "${message}"

Provide helpful, specific advice. If suggesting actions on specific tasks, mention them by name. Keep response under 200 words but be actionable.`;
  }

  private buildAnalysisPrompt(tasks: Task[], analysisType: string): string {
    const taskSummary = this.summarizeTasks(tasks);
    
    const analysisPrompts = {
      priority: 'Analyze task priorities. Which tasks should be done first and why? Consider ROI, deadlines, and dependencies.',
      gaps: 'Identify missing information in these tasks. What data is needed for better prioritization?',
      optimization: 'Suggest optimizations for this task list. What can be improved, combined, or eliminated?',
      bottlenecks: 'Identify potential bottlenecks and blockers in this task workflow.'
    };

    return `${taskSummary}

${analysisPrompts[analysisType as keyof typeof analysisPrompts]}

Provide specific, actionable insights in under 300 words.`;
  }

  private summarizeTasks(tasks: Task[]): string {
    if (tasks.length === 0) return 'No tasks available.';

    const byStatus = tasks.reduce((acc, task) => {
      const status = task.status || 'backlog';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const highROI = tasks.filter(t => (t.roi || 0) > 100).length;
    const missingData = tasks.filter(t => !t.value || !t.effort).length;
    const urgent = tasks.filter(t => {
      if (!t.dueDate) return false;
      const days = (new Date(t.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return days <= 2;
    }).length;

    return `Task Overview:
- Total: ${tasks.length} tasks
- Status: ${Object.entries(byStatus).map(([k, v]) => `${k}(${v})`).join(', ')}
- High ROI (>$100/h): ${highROI}
- Missing data: ${missingData}
- Urgent (≤2 days): ${urgent}

Top tasks by ROI:
${tasks
  .filter(t => t.roi && t.roi > 0)
  .sort((a, b) => (b.roi || 0) - (a.roi || 0))
  .slice(0, 3)
  .map(t => `- "${t.content}" ($${Math.round(t.roi || 0)}/h)`)
  .join('\n')}`;
  }

  private parseAIResponse(text: string, context: ChatContext): AIResponse {
    void context; // Unused but required for interface
    // Simple parsing - could be enhanced with structured output
    const suggestions: ActionSuggestion[] = [];
    
    // Extract action suggestions from text (basic implementation)
    if (text.toLowerCase().includes('prioritize') || text.toLowerCase().includes('focus on')) {
      suggestions.push({
        type: 'prioritize',
        title: 'Prioritize recommended tasks',
        description: 'Focus on the tasks mentioned in the analysis'
      });
    }

    if (text.toLowerCase().includes('estimate') || text.toLowerCase().includes('missing')) {
      suggestions.push({
        type: 'estimate',
        title: 'Add missing estimates',
        description: 'Complete value and effort data for better prioritization'
      });
    }

    if (text.toLowerCase().includes('break down') || text.toLowerCase().includes('split')) {
      suggestions.push({
        type: 'breakdown',
        title: 'Break down complex tasks',
        description: 'Split large tasks into manageable pieces'
      });
    }

    return {
      reply: text,
      suggestions
    };
  }

  private parseEstimateResponse(text: string): { value: number; effort: number; reasoning: string } {
    const valueMatch = text.match(/VALUE:\s*\$?(\d+)/i);
    const effortMatch = text.match(/EFFORT:\s*(\d+\.?\d*)/i);
    const reasoningMatch = text.match(/REASONING:\s*(.+)/i);

    return {
      value: valueMatch ? parseInt(valueMatch[1]) : 1000,
      effort: effortMatch ? parseFloat(effortMatch[1]) : 2,
      reasoning: reasoningMatch ? reasoningMatch[1].trim() : 'AI-generated estimate'
    };
  }

  private async handleSpecialCommands(message: string, context: ChatContext): Promise<AIResponse | null> {
    const lowerMessage = message.toLowerCase();
    
    // Daily Planning
    if (lowerMessage.includes('plan my day') || lowerMessage.includes('daily plan')) {
      return this.generateDailyPlan(context);
    }
    
    // Weekly Review
    if (lowerMessage.includes('weekly review') || lowerMessage.includes('week summary')) {
      return this.generateWeeklyReview(context);
    }
    
    // Crisis Mode
    if (lowerMessage.includes('overwhelmed') || lowerMessage.includes('everything is on fire') || lowerMessage.includes('crisis')) {
      return this.handleCrisisMode(context);
    }
    
    // ROI Optimization
    if (lowerMessage.includes('optimize roi') || lowerMessage.includes('maximize value')) {
      return this.optimizeForROI(context);
    }
    
    // Delegation Advisor
    if (lowerMessage.includes('delegate') || lowerMessage.includes('assign to others')) {
      return this.suggestDelegation(context);
    }
    
    // Status Report
    if (lowerMessage.includes('status report') || lowerMessage.includes('update for')) {
      return this.generateStatusReport(context);
    }
    
    // Procrastination Help
    if (lowerMessage.includes('procrastinat') || lowerMessage.includes('stuck on')) {
      return this.breakProcrastination(message, context);
    }
    
    // Time Audit
    if (lowerMessage.includes('time audit') || lowerMessage.includes('where is my time')) {
      return this.performTimeAudit(context);
    }
    
    return null;
  }
  
  private async generateDailyPlan(context: ChatContext): Promise<AIResponse> {
    const { tasks } = context;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Filter today's tasks and high priority items
    const urgentTasks = tasks.filter(t => {
      if (t.dueDate) {
        const due = new Date(t.dueDate);
        return due <= new Date(today.getTime() + 86400000); // Today or overdue
      }
      return false;
    });
    
    const highROITasks = tasks
      .filter(t => t.roi && t.roi > 100 && !urgentTasks.includes(t))
      .sort((a, b) => (b.roi || 0) - (a.roi || 0))
      .slice(0, 3);
    
    const totalEffort = [...urgentTasks, ...highROITasks]
      .reduce((sum, t) => sum + (t.effort || 2), 0);
    
    let plan = `📅 Daily Plan for ${now.toLocaleDateString()}\n\n`;
    plan += `⏰ Total Estimated Time: ${totalEffort.toFixed(1)} hours\n\n`;
    
    if (urgentTasks.length > 0) {
      plan += `🔴 URGENT (Due Today):\n`;
      urgentTasks.forEach(t => {
        plan += `• ${t.content} (${t.effort || 2}h)\n`;
      });
      plan += `\n`;
    }
    
    if (highROITasks.length > 0) {
      plan += `💰 HIGH VALUE:\n`;
      highROITasks.forEach(t => {
        plan += `• ${t.content} ($${Math.round(t.roi || 0)}/h, ${t.effort || 2}h)\n`;
      });
      plan += `\n`;
    }
    
    plan += `⏰ SUGGESTED SCHEDULE:\n`;
    plan += `9:00-11:00 - Deep work (highest ROI task)\n`;
    plan += `11:00-11:30 - Email/Slack check\n`;
    plan += `11:30-13:00 - Urgent tasks\n`;
    plan += `14:00-16:00 - Meetings/Collaboration\n`;
    plan += `16:00-17:00 - Admin/Low energy tasks\n\n`;
    plan += `💡 Remember to take breaks every 90 minutes!`;
    
    return {
      reply: plan,
      suggestions: [
        {
          type: 'focus',
          title: 'Start with deep work',
          description: 'Begin your highest ROI task now'
        },
        {
          type: 'prioritize',
          title: 'Focus on urgent',
          description: 'Complete time-sensitive tasks first'
        }
      ]
    };
  }
  
  private async generateWeeklyReview(context: ChatContext): Promise<AIResponse> {
    const { tasks } = context;
    
    const completedTasks = tasks.filter(t => t.status === 'done');
    const activeTasks = tasks.filter(t => t.status !== 'done');
    const overdueTasks = tasks.filter(t => {
      if (t.dueDate && t.status !== 'done') {
        return new Date(t.dueDate) < new Date();
      }
      return false;
    });
    
    const totalValue = completedTasks.reduce((sum, t) => sum + (t.value || 0), 0);
    const totalEffort = completedTasks.reduce((sum, t) => sum + (t.effort || 0), 0);
    const avgROI = totalEffort > 0 ? totalValue / totalEffort : 0;
    
    let review = `📊 Weekly Review\n\n`;
    review += `✅ Completed: ${completedTasks.length} tasks\n`;
    review += `💰 Value Delivered: $${totalValue.toLocaleString()}\n`;
    review += `⏱️ Time Invested: ${totalEffort.toFixed(1)} hours\n`;
    review += `📈 Average ROI: $${Math.round(avgROI)}/hour\n\n`;
    
    if (overdueTasks.length > 0) {
      review += `⚠️ OVERDUE (${overdueTasks.length}):\n`;
      overdueTasks.slice(0, 3).forEach(t => {
        review += `• ${t.content}\n`;
      });
      review += `\n`;
    }
    
    review += `🎯 RECOMMENDATIONS:\n`;
    if (avgROI < 100) {
      review += `• Focus on higher-value tasks (current ROI is low)\n`;
    }
    if (overdueTasks.length > 3) {
      review += `• Clear overdue backlog before taking new work\n`;
    }
    if (activeTasks.length > 20) {
      review += `• Consider delegating or deferring some tasks\n`;
    }
    review += `• Schedule time for planning next week\n`;
    
    return {
      reply: review,
      suggestions: [
        {
          type: 'weekly-review',
          title: 'Plan next week',
          description: 'Set priorities for upcoming week'
        },
        {
          type: 'prioritize',
          title: 'Clear overdue',
          description: 'Focus on overdue tasks'
        }
      ]
    };
  }
  
  private async handleCrisisMode(context: ChatContext): Promise<AIResponse> {
    const { tasks } = context;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Triage tasks
    const critical = tasks.filter(t => {
      if (t.dueDate) {
        const due = new Date(t.dueDate);
        return due <= today && t.status !== 'done';
      }
      return false;
    });
    
    const important = tasks
      .filter(t => !critical.includes(t) && t.value && t.value > 1000)
      .slice(0, 3);
    
    const canDefer = tasks
      .filter(t => !critical.includes(t) && !important.includes(t))
      .slice(0, 5);
    
    let response = `🚨 CRISIS TRIAGE\n\n`;
    response += `Take 3 deep breaths. Let's handle this systematically.\n\n`;
    
    response += `🔴 DO NOW (Critical):\n`;
    if (critical.length > 0) {
      critical.slice(0, 3).forEach((t, i) => {
        response += `${i + 1}. ${t.content} (${t.effort || 1}h)\n`;
      });
    } else {
      response += `• No truly critical items - that's good!\n`;
    }
    response += `\n`;
    
    response += `🟡 DO TODAY (Important):\n`;
    important.forEach((t, i) => {
      response += `${i + 1}. ${t.content}\n`;
    });
    response += `\n`;
    
    response += `🟢 DEFER/DELEGATE:\n`;
    response += `• Send "update coming tomorrow" emails\n`;
    response += `• Reschedule non-critical meetings\n`;
    response += `• Ask for help on complex tasks\n\n`;
    
    response += `📋 ACTION PLAN:\n`;
    response += `1. Handle critical items one by one\n`;
    response += `2. Communicate delays proactively\n`;
    response += `3. Block tomorrow morning for catch-up\n`;
    response += `4. Say NO to new requests today\n\n`;
    response += `💪 You've got this! Focus on one task at a time.`;
    
    return {
      reply: response,
      suggestions: [
        {
          type: 'crisis',
          title: 'Start critical task',
          description: 'Begin with the most urgent item'
        },
        {
          type: 'delegate',
          title: 'Request help',
          description: 'Identify tasks to delegate'
        }
      ]
    };
  }
  
  private async optimizeForROI(context: ChatContext): Promise<AIResponse> {
    const { tasks } = context;
    
    const tasksWithROI = tasks
      .filter(t => t.roi && t.roi > 0 && t.status !== 'done')
      .sort((a, b) => (b.roi || 0) - (a.roi || 0));
    
    const top10 = tasksWithROI.slice(0, 10);
    const totalValue = top10.reduce((sum, t) => sum + (t.value || 0), 0);
    const totalEffort = top10.reduce((sum, t) => sum + (t.effort || 0), 0);
    
    let response = `💰 ROI OPTIMIZATION REPORT\n\n`;
    response += `📊 Top 10 Highest ROI Tasks:\n\n`;
    
    top10.forEach((t, i) => {
      response += `${i + 1}. ${t.content}\n`;
      response += `   ROI: $${Math.round(t.roi || 0)}/h | Value: $${t.value} | Time: ${t.effort}h\n\n`;
    });
    
    response += `📈 SUMMARY:\n`;
    response += `• Total Value: $${totalValue.toLocaleString()}\n`;
    response += `• Total Time: ${totalEffort.toFixed(1)} hours\n`;
    response += `• Average ROI: $${Math.round(totalValue / totalEffort)}/hour\n\n`;
    
    response += `💡 RECOMMENDATIONS:\n`;
    response += `• Focus exclusively on top 5 ROI tasks this week\n`;
    response += `• Delegate or delete tasks with ROI < $50/hour\n`;
    response += `• Batch similar low-ROI tasks together\n`;
    response += `• Say no to new low-value requests\n`;
    
    return {
      reply: response,
      suggestions: [
        {
          type: 'prioritize',
          title: 'Start #1 ROI task',
          description: top10[0] ? `Begin "${top10[0].content}"` : 'Start highest value task'
        },
        {
          type: 'focus',
          title: 'Focus mode',
          description: 'Work on top 5 ROI tasks only'
        }
      ]
    };
  }
  
  private async suggestDelegation(context: ChatContext): Promise<AIResponse> {
    const { tasks } = context;
    
    const delegatable = tasks.filter(t => {
      // Low ROI, routine, or not requiring special expertise
      return t.status !== 'done' && (
        (t.roi && t.roi < 100) ||
        t.content.toLowerCase().includes('email') ||
        t.content.toLowerCase().includes('meeting notes') ||
        t.content.toLowerCase().includes('update') ||
        t.content.toLowerCase().includes('report')
      );
    });
    
    let response = `👥 DELEGATION ANALYSIS\n\n`;
    response += `Found ${delegatable.length} tasks suitable for delegation:\n\n`;
    
    response += `📋 DELEGATE IMMEDIATELY:\n`;
    delegatable.slice(0, 5).forEach(t => {
      response += `• ${t.content}\n`;
      response += `  Why: ${t.roi ? `Low ROI ($${Math.round(t.roi)}/h)` : 'Routine task'}\n\n`;
    });
    
    response += `📝 DELEGATION TEMPLATE:\n`;
    response += `"Hi [Name], could you help with [task]?\n`;
    response += `Context: [why it matters]\n`;
    response += `Deadline: [date]\n`;
    response += `Success looks like: [clear outcome]\n`;
    response += `Let me know if you need any clarification."\n\n`;
    
    response += `💡 TIPS:\n`;
    response += `• Delegate outcomes, not just tasks\n`;
    response += `• Provide clear success criteria\n`;
    response += `• Set check-in points for longer tasks\n`;
    response += `• Thank people for their help\n`;
    
    return {
      reply: response,
      suggestions: [
        {
          type: 'delegate',
          title: 'Create delegation list',
          description: 'Export tasks for delegation'
        }
      ]
    };
  }
  
  private async generateStatusReport(context: ChatContext): Promise<AIResponse> {
    const { tasks } = context;
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    
    const completed = tasks.filter(t => t.status === 'done');
    const inProgress = tasks.filter(t => t.status === 'now');
    const blocked = tasks.filter(t => t.status === 'waiting');
    
    let report = `📊 STATUS REPORT\n\n`;
    report += `Week of ${thisWeek.toLocaleDateString()} - ${new Date().toLocaleDateString()}\n\n`;
    
    report += `✅ COMPLETED (${completed.length}):\n`;
    completed.slice(0, 5).forEach(t => {
      report += `• ${t.content}${t.value ? ` ($${t.value} value)` : ''}\n`;
    });
    report += `\n`;
    
    report += `🔄 IN PROGRESS (${inProgress.length}):\n`;
    inProgress.slice(0, 5).forEach(t => {
      report += `• ${t.content}${t.effort ? ` (${Math.round((t.effort || 0) * 0.5)}h remaining)` : ''}\n`;
    });
    report += `\n`;
    
    if (blocked.length > 0) {
      report += `⚠️ BLOCKED (${blocked.length}):\n`;
      blocked.slice(0, 3).forEach(t => {
        report += `• ${t.content}\n`;
      });
      report += `\n`;
    }
    
    report += `📅 NEXT WEEK PRIORITIES:\n`;
    const upcoming = tasks
      .filter(t => t.status === 'next')
      .slice(0, 3);
    upcoming.forEach(t => {
      report += `• ${t.content}\n`;
    });
    report += `\n`;
    
    report += `📈 KEY METRICS:\n`;
    report += `• Completion Rate: ${Math.round((completed.length / (completed.length + inProgress.length + blocked.length)) * 100)}%\n`;
    report += `• Value Delivered: $${completed.reduce((sum, t) => sum + (t.value || 0), 0).toLocaleString()}\n`;
    report += `• Time Invested: ${completed.reduce((sum, t) => sum + (t.effort || 0), 0).toFixed(1)} hours\n`;
    
    return {
      reply: report,
      suggestions: [
        {
          type: 'report',
          title: 'Copy report',
          description: 'Copy to clipboard for email'
        }
      ]
    };
  }
  
  private async breakProcrastination(message: string, context: ChatContext): Promise<AIResponse> {
    // Extract the specific task mentioned
    const taskMatch = message.match(/on ["'](.+?)["']|on (.+?)$/i);
    const taskName = taskMatch ? (taskMatch[1] || taskMatch[2]) : null;
    
    let response = `🎯 PROCRASTINATION BREAKER\n\n`;
    
    if (taskName) {
      response += `Let's tackle "${taskName}" together!\n\n`;
    }
    
    response += `🧠 WHY WE PROCRASTINATE:\n`;
    response += `• Task feels too big → Break it down\n`;
    response += `• Unclear outcome → Define success\n`;
    response += `• Fear of failure → Lower the bar\n`;
    response += `• Boring task → Add rewards\n\n`;
    
    response += `⚡ QUICK START TECHNIQUE:\n`;
    response += `1. Set timer for just 10 minutes\n`;
    response += `2. Do the tiniest first step:\n`;
    response += `   • Open the document\n`;
    response += `   • Write one sentence\n`;
    response += `   • Send one email\n`;
    response += `3. Stop when timer rings (or continue if flowing)\n\n`;
    
    response += `🎮 GAMIFICATION IDEAS:\n`;
    response += `• Reward: Coffee after 25 minutes\n`;
    response += `• Challenge: Beat yesterday's progress\n`;
    response += `• Accountability: Tell someone you'll finish by 3pm\n`;
    response += `• Visual: Cross off subtasks as you go\n\n`;
    
    response += `💪 MOTIVATION:\n`;
    response += `"The secret to getting ahead is getting started."\n`;
    response += `You don't need to be perfect, just start!\n`;
    
    return {
      reply: response,
      suggestions: [
        {
          type: 'focus',
          title: 'Start 10-min timer',
          description: 'Begin with tiny step'
        },
        {
          type: 'breakdown',
          title: 'Break it down',
          description: 'Split into smaller tasks'
        }
      ]
    };
  }
  
  private async performTimeAudit(context: ChatContext): Promise<AIResponse> {
    const { tasks } = context;
    
    // Group tasks by status and calculate time
    const timeByStatus = {
      done: tasks.filter(t => t.status === 'done').reduce((sum, t) => sum + (t.effort || 0), 0),
      now: tasks.filter(t => t.status === 'now').reduce((sum, t) => sum + (t.effort || 0), 0),
      next: tasks.filter(t => t.status === 'next').reduce((sum, t) => sum + (t.effort || 0), 0),
      waiting: tasks.filter(t => t.status === 'waiting').reduce((sum, t) => sum + (t.effort || 0), 0),
      someday: tasks.filter(t => t.status === 'someday').reduce((sum, t) => sum + (t.effort || 0), 0)
    };
    
    const totalTime = Object.values(timeByStatus).reduce((a, b) => a + b, 0);
    
    let response = `⏱️ TIME AUDIT REPORT\n\n`;
    response += `📊 TIME ALLOCATION:\n`;
    response += `• Completed: ${timeByStatus.done.toFixed(1)}h (${Math.round(timeByStatus.done / totalTime * 100)}%)\n`;
    response += `• In Progress: ${timeByStatus.now.toFixed(1)}h (${Math.round(timeByStatus.now / totalTime * 100)}%)\n`;
    response += `• Planned: ${timeByStatus.next.toFixed(1)}h (${Math.round(timeByStatus.next / totalTime * 100)}%)\n`;
    response += `• Blocked: ${timeByStatus.waiting.toFixed(1)}h (${Math.round(timeByStatus.waiting / totalTime * 100)}%)\n`;
    response += `• Backlog: ${timeByStatus.someday.toFixed(1)}h\n\n`;
    
    // Analyze patterns
    const highEffortTasks = tasks.filter(t => t.effort && t.effort > 8);
    const quickWins = tasks.filter(t => t.effort && t.effort <= 1 && t.roi && t.roi > 100);
    
    response += `🔍 INSIGHTS:\n`;
    if (highEffortTasks.length > 3) {
      response += `• ${highEffortTasks.length} tasks need >8 hours - consider breaking down\n`;
    }
    if (quickWins.length > 0) {
      response += `• ${quickWins.length} quick wins available (<1h, high ROI)\n`;
    }
    if (timeByStatus.waiting > timeByStatus.now) {
      response += `• Too much time blocked - need to unblock or delegate\n`;
    }
    response += `\n`;
    
    response += `💡 RECOMMENDATIONS:\n`;
    response += `• Batch similar small tasks together\n`;
    response += `• Block 2-4 hour chunks for deep work\n`;
    response += `• Limit work-in-progress to 3-5 tasks\n`;
    response += `• Review and prune "someday" list monthly\n`;
    
    return {
      reply: response,
      suggestions: [
        {
          type: 'focus',
          title: 'Do quick wins',
          description: 'Complete high-ROI tasks under 1 hour'
        }
      ]
    };
  }
  
  private getFallbackResponse(message: string, context: ChatContext): AIResponse {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('priorit') || lowerMessage.includes('what should i work on')) {
      const highROITasks = context.tasks
        .filter(task => task.roi && task.roi > 0)
        .sort((a, b) => (b.roi || 0) - (a.roi || 0))
        .slice(0, 3);
      
      if (highROITasks.length > 0) {
        const topTask = highROITasks[0];
        return {
          reply: `Based on ROI analysis, I recommend starting with "${topTask.content}" ($${Math.round(topTask.roi || 0)}/hour). It offers the best return on your time investment.`,
          suggestions: [{
            type: 'prioritize',
            title: 'Start highest ROI task',
            description: `Begin "${topTask.content}"`,
            taskIds: [topTask.id]
          }]
        };
      }
    }

    return {
      reply: "I'm here to help with task prioritization! Try asking: 'What should I work on next?' or 'Analyze my tasks for bottlenecks.'",
      suggestions: []
    };
  }

  private getFallbackAnalysis(tasks: Task[], analysisType: string): string {
    const totalTasks = tasks.length;
    const missingData = tasks.filter(t => !t.value || !t.effort).length;
    
    switch (analysisType) {
      case 'priority':
        return `Priority Analysis: ${totalTasks} tasks found. Focus on high-ROI tasks first, then handle urgent deadlines. ${missingData} tasks need value/effort estimates for better prioritization.`;
      case 'gaps':
        return `Data Gaps: ${missingData} of ${totalTasks} tasks are missing value or effort estimates. Complete this data to improve decision-making accuracy.`;
      case 'optimization':
        return `Optimization Opportunities: Review large tasks for breakdown potential. Consider batching similar tasks together for efficiency.`;
      case 'bottlenecks':
        return `Bottleneck Analysis: Review tasks in 'doing' status - too many active tasks can reduce focus. Prioritize completion over starting new work.`;
      default:
        return `Analysis complete for ${totalTasks} tasks.`;
    }
  }

  private getFallbackBreakdown(task: Task): string[] {
    void task; // Unused but needed for fallback
    return [
      'Research and planning phase',
      'Initial setup and preparation',
      'Core implementation work',
      'Testing and quality review',
      'Final delivery and documentation'
    ];
  }
}

// Export singleton instance
export const geminiAssistant = new GeminiTaskAssistant();