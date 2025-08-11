/**
 * GTD Page to Status Mapping Utility
 * Handles automatic status assignment based on GTD page location
 */

import { TaskMetadata } from '@/types/index';

export type GTDPageId = 'inbox' | 'next-actions' | 'waiting-for' | 'someday-maybe';
export type TaskStatus = 'now' | 'next' | 'waiting' | 'someday' | 'done';

/**
 * Maps GTD page IDs to their corresponding task statuses
 */
export const GTD_PAGE_TO_STATUS_MAP: Record<GTDPageId, TaskStatus> = {
  'inbox': 'someday',           // Inbox = quick capture, default to someday
  'next-actions': 'next',       // Next Actions = ready to work on
  'waiting-for': 'waiting',     // Waiting For = delegated/pending
  'someday-maybe': 'someday'    // Someday/Maybe = future consideration
};

/**
 * Maps task statuses back to their preferred GTD pages
 */
export const STATUS_TO_GTD_PAGE_MAP: Record<TaskStatus, GTDPageId> = {
  'now': 'next-actions',        // Currently working = Next Actions
  'next': 'next-actions',       // Ready to work = Next Actions
  'waiting': 'waiting-for',     // Waiting = Waiting For
  'someday': 'someday-maybe',   // Future = Someday/Maybe
  'done': 'next-actions'        // Completed tasks can stay in Next Actions
};

/**
 * Determines if a page ID is a GTD page
 */
export function isGTDPage(pageId: string): pageId is GTDPageId {
  return ['inbox', 'next-actions', 'waiting-for', 'someday-maybe'].includes(pageId);
}

/**
 * Gets the appropriate status for a given page ID
 */
export function getStatusForPage(pageId: string): TaskStatus | null {
  if (isGTDPage(pageId)) {
    return GTD_PAGE_TO_STATUS_MAP[pageId];
  }
  // Non-GTD pages don't enforce a specific status
  return null;
}

/**
 * Gets the preferred GTD page for a given status
 */
export function getPageForStatus(status: TaskStatus): GTDPageId {
  return STATUS_TO_GTD_PAGE_MAP[status];
}

/**
 * Updates task metadata with appropriate status based on page location
 * Preserves manual overrides and completed status
 */
export function updateTaskMetadataForPage(
  currentMetadata: TaskMetadata | undefined,
  pageId: string,
  options: {
    preserveCompleted?: boolean;     // Keep 'done' status regardless of page
    preserveManualStatus?: boolean;  // Don't override if status was manually set
    forceUpdate?: boolean;           // Override all preservations
  } = {}
): TaskMetadata {
  const {
    preserveCompleted = true,
    preserveManualStatus = false,
    forceUpdate = false
  } = options;

  const currentStatus = currentMetadata?.status;
  const newStatus = getStatusForPage(pageId);

  // Always preserve completed status (even when forcing updates)
  if (preserveCompleted && currentStatus === 'done') {
    return currentMetadata || { status: 'done' };
  }
  
  // For non-GTD pages, preserve current status or default to 'someday'
  if (newStatus === null) {
    return currentMetadata || { status: 'someday' };
  }

  // Preserve manual status unless forced (this would require tracking manual vs auto-set)
  if (preserveManualStatus && !forceUpdate && currentStatus && currentStatus !== newStatus) {
    return currentMetadata || { status: currentStatus };
  }

  // Update status based on page
  return {
    ...currentMetadata,
    status: newStatus
  };
}

/**
 * Checks if a task's status matches its page location
 */
export function isStatusConsistentWithPage(
  taskMetadata: TaskMetadata | undefined,
  pageId: string
): boolean {
  const currentStatus = taskMetadata?.status;
  
  // 'done' tasks are considered consistent anywhere
  if (currentStatus === 'done') return true;
  
  // For non-GTD pages, any status is considered consistent
  // (tasks on regular pages can have any status)
  if (!isGTDPage(pageId)) return true;
  
  // For GTD pages, check if status matches expected
  const expectedStatus = GTD_PAGE_TO_STATUS_MAP[pageId as GTDPageId];
  return currentStatus === expectedStatus;
}

/**
 * Gets suggestions for status/page alignment
 */
export function getAlignmentSuggestion(
  taskMetadata: TaskMetadata | undefined,
  pageId: string
): {
  type: 'status-update' | 'page-move' | 'consistent';
  suggestion?: string;
  targetStatus?: TaskStatus;
  targetPage?: GTDPageId;
} {
  const currentStatus = taskMetadata?.status;
  
  // Done tasks are always consistent
  if (currentStatus === 'done') {
    return { type: 'consistent' };
  }
  
  // Non-GTD pages don't have alignment requirements
  if (!isGTDPage(pageId)) {
    return { type: 'consistent' };
  }
  
  const expectedStatus = GTD_PAGE_TO_STATUS_MAP[pageId as GTDPageId];
  
  if (!currentStatus || currentStatus === expectedStatus) {
    return { type: 'consistent' };
  }
  
  return {
    type: 'status-update',
    suggestion: `Update status from '${currentStatus}' to '${expectedStatus}' to match ${pageId} page`,
    targetStatus: expectedStatus
  };
}
