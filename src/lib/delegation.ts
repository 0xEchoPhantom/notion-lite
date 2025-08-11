import { db } from '@/firebase/client';
import { collection, addDoc, doc, updateDoc, deleteDoc, getDocs, Timestamp } from 'firebase/firestore';
import type { Assignee, AssigneeCreateInput } from '@/types/delegation';

const col = (userId: string) => collection(db, 'users', userId, 'assignees');

export async function listAssignees(userId: string): Promise<Assignee[]> {
  const snapshot = await getDocs(col(userId));
  return snapshot.docs.map(d => ({
    id: d.id,
    name: d.data().name,
    email: d.data().email,
    company: d.data().company,
    abilities: d.data().abilities || [],
    responsibilities: d.data().responsibilities || [],
    notes: d.data().notes,
    active: d.data().active ?? true,
    createdAt: d.data().createdAt?.toDate() || new Date(),
    updatedAt: d.data().updatedAt?.toDate() || new Date(),
  }));
}

export async function createAssignee(userId: string, input: AssigneeCreateInput): Promise<string> {
  const docRef = await addDoc(col(userId), {
    name: input.name,
    email: input.email || null,
    company: input.company || null,
    abilities: input.abilities || [],
    responsibilities: input.responsibilities || [],
    notes: input.notes || '',
    active: input.active ?? true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateAssignee(userId: string, assigneeId: string, patch: Partial<AssigneeCreateInput>): Promise<void> {
  const ref = doc(db, 'users', userId, 'assignees', assigneeId);
  await updateDoc(ref, { ...patch, updatedAt: Timestamp.now() });
}

export async function deleteAssignee(userId: string, assigneeId: string): Promise<void> {
  const ref = doc(db, 'users', userId, 'assignees', assigneeId);
  await deleteDoc(ref);
}
