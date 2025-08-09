// Task mirror service - syncs todo-list blocks to tasks collection

import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  onSnapshot,
  Timestamp,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { db } from '@/firebase/client';
import { Block } from '@/types/index';
import { Task, TaskStatus, calculateROI, TASK_RULES } from '@/types/task';
import { parseTaskTokens } from '@/utils/smartTokenParser';

export class TaskMirrorService {
  private userId: string;
  private listeners: Map<string, () => void> = new Map();

  constructor(userId: string) {
    this.userId = userId;
  }

  // Mirror a todo-list block to tasks collection
  async mirrorBlock(block: Block, pageId: string): Promise<void> {
    if (block.type !== 'todo-list') return;

    const taskRef = doc(db, 'users', this.userId, 'tasks', block.id);
    
    // Parse tokens from content
    const parsed = parseTaskTokens(block.content);
    
    // Determine initial status
    let status: TaskStatus = 'someday';
    if (block.isChecked) {
      status = 'done';
    } else if (parsed.values.effort && parsed.values.effort <= 0.5) {
      status = 'now'; // 30 minutes or less = do now
    }

    // Build task data - filter out undefined values
    const taskData: any = {
      blockId: block.id,
      pageId,
      userId: this.userId,
      content: parsed.cleanContent,
      rawContent: block.content,
      status,
      isCompleted: block.isChecked || false,
      subtaskIds: [],
      updatedAt: serverTimestamp(),
    };

    // Only add optional fields if they have values
    if (parsed.values.value !== undefined) {
      taskData.value = parsed.values.value;
    }
    if (parsed.values.effort !== undefined) {
      taskData.effort = parsed.values.effort;
    }
    if (parsed.values.probability !== undefined) {
      taskData.probability = parsed.values.probability;
    }
    if (parsed.values.dueDate !== undefined) {
      taskData.dueDate = parsed.values.dueDate;
    }
    if (parsed.values.assignee !== undefined) {
      taskData.assignee = parsed.values.assignee;
    }
    if (parsed.values.company !== undefined) {
      taskData.company = parsed.values.company;
    }
    if (parsed.values.tags && parsed.values.tags.length > 0) {
      taskData.tags = parsed.values.tags;
    }
    if (block.isChecked) {
      taskData.completedAt = Timestamp.now();
    }

    // Don't include ROI in client write (server-computed)
    
    try {
      // Check if task exists to preserve createdAt
      const taskDoc = await getDoc(taskRef);
      if (!taskDoc.exists()) {
        taskData.createdAt = serverTimestamp();
      }
      
      await setDoc(taskRef, taskData, { merge: true });
    } catch (error) {
      console.error('Error mirroring block to task:', error);
    }
  }

  // Remove task when block is deleted
  async removeTask(blockId: string): Promise<void> {
    try {
      const taskRef = doc(db, 'users', this.userId, 'tasks', blockId);
      await deleteDoc(taskRef);
    } catch (error) {
      console.error('Error removing task:', error);
    }
  }

  // Update task completion status
  async updateTaskCompletion(blockId: string, isCompleted: boolean): Promise<void> {
    try {
      const taskRef = doc(db, 'users', this.userId, 'tasks', blockId);
      await updateDoc(taskRef, {
        isCompleted,
        completedAt: isCompleted ? serverTimestamp() : null,
        status: isCompleted ? 'done' : 'someday',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating task completion:', error);
    }
  }

  // Move task to different status with validation
  async moveTaskToStatus(
    taskId: string, 
    newStatus: TaskStatus
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const taskRef = doc(db, 'users', this.userId, 'tasks', taskId);
      const taskDoc = await getDoc(taskRef);
      
      if (!taskDoc.exists()) {
        return { success: false, errors: ['Task not found'] };
      }

      const task = { id: taskDoc.id, ...taskDoc.data() } as Task;

      // Validate move to 'next' status
      if (newStatus === 'next') {
        // Check WIP limit
        const wipCount = await this.getCurrentWIPCount();
        
        const errors: string[] = [];
        
        if (wipCount >= TASK_RULES.MAX_WIP) {
          errors.push(`WIP limit reached (${TASK_RULES.MAX_WIP} tasks max)`);
        }
        
        if (!task.dueDate) {
          errors.push('Task must have a due date');
        }
        
        if (task.subtaskIds.length === 0) {
          errors.push('Task must have at least 1 subtask');
        }
        
        if (errors.length > 0) {
          return { success: false, errors };
        }
      }

      // Update task status
      await updateDoc(taskRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
        ...(newStatus === 'next' && { promotedToNextAt: serverTimestamp() })
      });

      // Log event
      await this.logTaskEvent(taskId, 'promoted', task.status, newStatus);

      return { success: true };
    } catch (error) {
      console.error('Error moving task:', error);
      return { success: false, errors: ['Failed to move task'] };
    }
  }

  // Get current WIP count
  private async getCurrentWIPCount(): Promise<number> {
    const tasksRef = collection(db, 'users', this.userId, 'tasks');
    const wipQuery = query(tasksRef, where('status', '==', 'next'));
    const snapshot = await getDocs(wipQuery);
    return snapshot.size;
  }

  // Update task hierarchy
  async linkSubtask(parentTaskId: string, subtaskId: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Update parent
      const parentRef = doc(db, 'users', this.userId, 'tasks', parentTaskId);
      const parentDoc = await getDoc(parentRef);
      if (parentDoc.exists()) {
        const currentSubtasks = parentDoc.data().subtaskIds || [];
        batch.update(parentRef, {
          subtaskIds: [...currentSubtasks, subtaskId],
          updatedAt: serverTimestamp()
        });
      }
      
      // Update child
      const childRef = doc(db, 'users', this.userId, 'tasks', subtaskId);
      batch.update(childRef, {
        parentTaskId,
        updatedAt: serverTimestamp()
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error linking subtask:', error);
    }
  }

  // Log task events for analytics
  private async logTaskEvent(
    taskId: string, 
    type: 'created' | 'promoted' | 'completed' | 'updated',
    fromStatus?: TaskStatus,
    toStatus?: TaskStatus
  ): Promise<void> {
    try {
      const eventsRef = collection(db, 'users', this.userId, 'taskEvents');
      await setDoc(doc(eventsRef), {
        taskId,
        userId: this.userId,
        type,
        fromStatus,
        toStatus,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging task event:', error);
    }
  }

  // Subscribe to blocks and auto-mirror todo-list blocks
  subscribeToPageBlocks(pageId: string): () => void {
    const blocksRef = collection(db, 'users', this.userId, 'pages', pageId, 'blocks');
    
    const unsubscribe = onSnapshot(blocksRef, async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        const block = { id: change.doc.id, ...change.doc.data() } as Block;
        
        if (block.type !== 'todo-list') continue;
        
        switch (change.type) {
          case 'added':
          case 'modified':
            await this.mirrorBlock(block, pageId);
            break;
          case 'removed':
            await this.removeTask(block.id);
            break;
        }
      }
    });

    this.listeners.set(pageId, unsubscribe);
    return unsubscribe;
  }

  // Cleanup all listeners
  cleanup(): void {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
  }
}

// Singleton instance management
let mirrorInstance: TaskMirrorService | null = null;

export function getTaskMirrorService(userId: string): TaskMirrorService {
  if (!mirrorInstance || mirrorInstance['userId'] !== userId) {
    if (mirrorInstance) {
      mirrorInstance.cleanup();
    }
    mirrorInstance = new TaskMirrorService(userId);
  }
  return mirrorInstance;
}