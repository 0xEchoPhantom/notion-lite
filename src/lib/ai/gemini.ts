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
  type: 'prioritize' | 'estimate' | 'breakdown' | 'focus';
  title: string;
  description: string;
  taskIds?: string[];
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

  async chatWithTasks(message: string, context: ChatContext): Promise<AIResponse> {
    try {
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