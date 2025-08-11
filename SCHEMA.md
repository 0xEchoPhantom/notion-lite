# Notion-Lite Database Schema v2.0

## Overview

This document describes the improved unified database schema for Notion-Lite, implementing:
1. **Unified block storage** - All blocks in a single collection
2. **Single source of truth for tasks** - Task metadata embedded in blocks
3. **Consistent data paths** - No more conditional path logic

## Collections Structure

### 1. Unified Blocks Collection
**Path:** `/users/{userId}/blocks/{blockId}`

```typescript
{
  // Core block fields
  id: string;
  type: 'paragraph' | 'bulleted-list' | 'todo-list' | ...;
  content: string;
  
  // Relationships
  pageId: string;        // e.g., "page123" or "gtd-inbox"
  workspaceId?: string;  // e.g., "gtd-workspace" or "notes-workspace"
  
  // Structure
  indentLevel: number;   // 0-4
  order: number;         // Position within page
  
  // Todo-specific
  isChecked?: boolean;   // For todo-list blocks
  
  // Task metadata (single source of truth)
  taskMetadata?: {
    dueDate?: Date;
    priority?: 'low' | 'medium' | 'high';
    tags?: string[];
    assignee?: string;
    energy?: 'low' | 'medium' | 'high';
    timeEstimate?: number; // minutes
    completed?: boolean;
  };
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2. Pages Collection
**Path:** `/users/{userId}/pages/{pageId}`

```typescript
{
  id: string;
  title: string;
  order: number;
  workspaceId?: string;
  isFixed?: boolean;     // For GTD fixed pages
  tags?: string[];       // For cross-workspace tagging
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 3. Workspaces Collection
**Path:** `/workspaces/{workspaceId}`

```typescript
{
  id: string;
  name: string;
  mode: 'gtd' | 'notes';
  userId: string;
  isDefault: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 4. Archive Collections
**Path:** `/users/{userId}/archivedBlocks/{blockId}`
**Path:** `/users/{userId}/archivedPages/{pageId}`

Same structure as original, plus:
- `archivedAt: Timestamp`
- `originalId: string`
- `originalCreatedAt: Timestamp`
- `originalUpdatedAt: Timestamp`

## Key Improvements

### 1. Unified Block Storage ✅
**Before:** Blocks scattered across `/pages/{pageId}/blocks` and `/gtd/{pageId}/blocks`
**After:** All blocks in `/users/{userId}/blocks` with `pageId` field

**Benefits:**
- Single query for all user blocks
- Better indexing capabilities
- No conditional path logic
- Easier migrations

### 2. Single Source of Truth for Tasks ✅
**Before:** Separate `/tasks` collection duplicating todo-list data
**After:** `taskMetadata` field within todo-list blocks

**Benefits:**
- No synchronization issues
- Atomic updates
- Reduced Firestore reads
- Consistent data

### 3. Normalized Page IDs
GTD pages use prefixed IDs:
- `gtd-inbox`
- `gtd-next-actions`
- `gtd-waiting-for`
- `gtd-someday-maybe`

Regular pages use their Firestore document IDs.

## Indexes

The following composite indexes are configured for optimal query performance:

1. **Page blocks query**
   - `pageId` (ASC) + `order` (ASC)
   - Used for: Loading blocks for a specific page

2. **Tasks query**
   - `type` (ASC) + `updatedAt` (DESC)
   - Used for: Getting all todo-list blocks

3. **Completed tasks filter**
   - `type` (ASC) + `taskMetadata.completed` (ASC) + `updatedAt` (DESC)
   - Used for: Filtering tasks by completion status

4. **Workspace blocks query**
   - `workspaceId` (ASC) + `type` (ASC) + `order` (ASC)
   - Used for: Getting all blocks in a workspace

## Migration Strategy

### From Old Schema to New Schema

1. **Run migration function**: `migrateToUnifiedBlocks(userId)`
   - Copies blocks from old locations to unified collection
   - Merges task data into taskMetadata
   - Preserves all existing data

2. **Update application code**: Use `firestoreUnified.ts` instead of `firestore.ts`

3. **Verify data**: Check that all blocks appear correctly

4. **Clean up old data**: After verification, delete old collections

### Backwards Compatibility

The `firestoreUnified.ts` file provides compatibility wrappers:
- `getBlocks()` → `getBlocksByPage()`
- `createBlockCompat()` → maintains old signature
- `updateBlockCompat()` → maintains old signature

## Query Examples

### Get all blocks for a page
```typescript
const blocks = await getBlocksByPage(userId, 'gtd-inbox');
```

### Get all incomplete tasks
```typescript
const tasks = await getAllTasks(userId, {
  completed: false,
  priority: 'high'
});
```

### Update task metadata
```typescript
await updateTaskMetadata(userId, blockId, {
  dueDate: new Date('2024-12-31'),
  priority: 'high',
  tags: ['urgent', 'client']
});
```

### Move block to different page
```typescript
await moveBlockToPage(userId, blockId, 'gtd-next-actions', 0);
```

## Security Rules

All user data is protected by authentication:
```
match /users/{userId}/{document=**} {
  allow read, write: if request.auth.uid == userId;
}
```

## Performance Considerations

1. **Indexed queries**: All common queries have composite indexes
2. **Pagination ready**: Can add `.limit()` and `.startAfter()` easily
3. **Batch operations**: Use `writeBatch()` for multiple updates
4. **Real-time updates**: Use `subscribeToPageBlocks()` for live sync

## Future Enhancements

1. **Add pagination**: Implement cursor-based pagination for large pages
2. **Add caching**: Implement client-side caching with React Query
3. **Add versioning**: Track block version history
4. **Add collaboration**: Multi-user access with permissions