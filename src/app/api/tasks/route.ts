// API endpoints for task operations with server-side ROI computation

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import '@/lib/firebaseAdmin'; // Initialize admin
import { Task, TaskStatus, TASK_RULES, calculateROI } from '@/types/task';

const auth = getAuth();
const db = getFirestore();

// Verify auth token
async function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// GET /api/tasks - Get tasks with computed ROI
export async function GET(request: NextRequest) {
  const user = await verifyToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const hasROI = searchParams.get('hasROI') === 'true';
    const missingData = searchParams.get('missingData') === 'true';

    let tasksRef = db.collection('users').doc(user.uid).collection('tasks');
    let query = tasksRef as any;

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    const tasks: Task[] = [];

    snapshot.forEach((doc: any) => {
      const data = doc.data();
      const task = {
        id: doc.id,
        ...data,
        // Compute ROI server-side
        roi: calculateROI({
          value: data.value,
          effort: data.effort,
          probability: data.probability
        } as Task),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
        promotedToNextAt: data.promotedToNextAt?.toDate(),
        dueDate: data.dueDate?.toDate(),
      } as Task;

      // Filter based on query params
      if (missingData && (!task.value || !task.effort)) {
        tasks.push(task);
      } else if (hasROI && task.roi !== null) {
        tasks.push(task);
      } else if (!missingData && !hasROI) {
        tasks.push(task);
      }
    });

    // Sort by ROI if requested
    if (hasROI) {
      tasks.sort((a, b) => (b.roi || 0) - (a.roi || 0));
    }

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tasks/move - Move task to new section with validation
export async function POST(request: NextRequest) {
  const user = await verifyToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { taskId, newStatus } = await request.json();

    if (!taskId || !newStatus) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!TASK_RULES.STATUSES.includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const taskRef = db.collection('users').doc(user.uid).collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = taskDoc.data() as Task;

    // Validate move to 'next' status
    if (newStatus === 'next') {
      const errors: string[] = [];

      // Check WIP limit
      const wipQuery = await db
        .collection('users')
        .doc(user.uid)
        .collection('tasks')
        .where('status', '==', 'next')
        .get();
      
      if (wipQuery.size >= TASK_RULES.MAX_WIP) {
        errors.push(`WIP limit reached (${TASK_RULES.MAX_WIP} tasks max)`);
      }

      // Check required fields
      if (!task.dueDate) {
        errors.push('Task must have a due date');
      }

      if (!task.subtaskIds || task.subtaskIds.length === 0) {
        errors.push('Task must have at least 1 subtask');
      }

      if (errors.length > 0) {
        return NextResponse.json({ 
          error: 'Validation failed', 
          errors 
        }, { status: 400 });
      }
    }

    // Update task
    await taskRef.update({
      status: newStatus,
      updatedAt: FieldValue.serverTimestamp(),
      ...(newStatus === 'next' && { 
        promotedToNextAt: FieldValue.serverTimestamp() 
      })
    });

    // Log event
    await db.collection('users').doc(user.uid).collection('taskEvents').add({
      taskId,
      userId: user.uid,
      type: 'promoted',
      fromStatus: task.status,
      toStatus: newStatus,
      timestamp: FieldValue.serverTimestamp()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error moving task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/tasks/:id - Update task (compute ROI server-side)
export async function PATCH(request: NextRequest) {
  const user = await verifyToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const taskId = url.pathname.split('/').pop();
    
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }

    const updates = await request.json();
    
    // Remove ROI from updates (server-computed only)
    delete updates.roi;
    
    const taskRef = db.collection('users').doc(user.uid).collection('tasks').doc(taskId);
    
    // Get current task data
    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Update task
    await taskRef.update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp()
    });

    // Get updated task with computed ROI
    const updatedDoc = await taskRef.get();
    const updatedData = updatedDoc.data();
    
    const task = {
      id: updatedDoc.id,
      ...updatedData,
      roi: calculateROI({
        value: updatedData?.value,
        effort: updatedData?.effort,
        probability: updatedData?.probability
      } as Task),
      createdAt: updatedData?.createdAt?.toDate(),
      updatedAt: updatedData?.updatedAt?.toDate(),
      completedAt: updatedData?.completedAt?.toDate(),
      dueDate: updatedData?.dueDate?.toDate(),
    };

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}