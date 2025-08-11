# Claude AI Assistant Best Practices for Notion-Lite

## 🎯 AI Assistant Instructions (READ FIRST)
When starting a new session with Claude, these are the critical things to know:

### Priority Commands to Run
```bash
# 1. Always check current state first
git status
npm run dev  # Keep running on port 3002

# 2. Before any code changes
npm run build  # Ensure no existing errors
npm run lint   # Check code quality

# 3. After making changes
npm run build  # Verify no new errors introduced
npm run lint   # Maintain code quality
```

### Critical Context
- **Hot Reload Port**: Always use port 3002 (hardcoded in multiple places)
- **Test in Browser**: Always test changes at http://localhost:3002 before committing
- **TypeScript Strict**: Project uses strict TypeScript - no `any` types allowed
- **Firebase Keys**: Never commit Firebase credentials - use environment variables
- **Build Before Deploy**: Always run `npm run build` successfully before deployment

### What NOT to Do
- ❌ Don't create new documentation files unless explicitly requested
- ❌ Don't commit without user's explicit request
- ❌ Don't use `any` type in TypeScript
- ❌ Don't modify Firebase security rules without understanding current structure
- ❌ Don't push to remote without user confirmation
- ❌ Don't create test files unless requested
- ❌ Don't refactor working code without being asked

## Project Overview
This document contains best practices, patterns, and lessons learned from developing the Notion-Lite project with Claude AI assistance. Use this as a reference for future development sessions.

## 🏗️ Architecture & Tech Stack

### Core Technologies
- **Frontend**: Next.js 15.4.5, React 18, TypeScript 5.x
- **Backend**: Firebase Firestore, Firebase Auth, Firebase Admin SDK
- **Styling**: TailwindCSS with custom components
- **Rich Text**: TipTap editor for rich text editing
- **AI Integration**: Google Vertex AI via Firebase
- **Deployment**: Vercel with automatic deployments

### Key Design Patterns
```javascript
// next.config.js
module.exports = {
  experimental: {
    // Enable SWC minification
    swcMinify: true,
  },
  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
  },
};
```

### Real Deployment Experience Log

#### Our Actual Build Errors & Fixes (August 2025)
**Error 1**: `Cannot find name 'setTaggedNotes'`
```typescript
// Problem: State variable was removed but still referenced
setTaggedNotes([]);

// Solution: Re-add missing state
const [taggedNotes, setTaggedNotes] = useState<Array<{ id: string; title: string; count: number }>>([]);
```

**Error 2**: `Expected 1 arguments, but got 0` (useRef)
```typescript
// Problem: useRef without initial value
const saveTimeoutRef = useRef<NodeJS.Timeout>();

// Solution: Provide initial value
const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
```

**Error 3**: `Type 'Block | null' is not assignable to type 'string | null'`
```typescript
// Problem: Function returning wrong type
const newBlockId = await moveBlockToPage(/*...*/);
return newBlockId; // Returns Block, expected string

// Solution: Extract the ID
const newBlock = await moveBlockToPage(/*...*/);
return newBlock?.id || null;
```

**Error 4**: `Property 'pageId' is missing in type`
```typescript
// Problem: Missing required field in type
const baseBlock: Omit<Block, 'id' | 'createdAt' | 'updatedAt'> = {
  type, content, indentLevel, order
  // Missing pageId
};

// Solution: Add missing field and extract from context
const { pageId } = useBlocks();
const baseBlock = { type, content, indentLevel, order, pageId };
```

#### Successful Deployment Pattern
```bash
# 1. Fix all TypeScript errors (critical)
npm run build
# Must see: ✓ Compiled successfully

# 2. Handle warnings (optional but clean)
# Add eslint-disable comments for intentional unused variables

# 3. Test Firebase integration
# Ensure credentials are not committed to repo
# Set environment variables in Vercel dashboard

# 4. Deploy
vercel --prod

# 5. Verify deployment
# Check URL loads correctly
# Test authentication flow
# Verify database operations
```

#### Build Success Indicators
```
✓ Compiled successfully in 3.0s
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (20/20)
✓ Collecting build traces
✓ Finalizing page optimization
```

#### Firebase Production Considerations
```
# Expected in Vercel logs (not errors):
No Firebase Admin credentials found. Admin SDK will not be available.
Failed to initialize Firebase Admin SDK: Error: Missing Firebase Admin credentials

# Solution: Add environment variables in Vercel dashboard
FIREBASE_ADMIN_PRIVATE_KEY (entire private key with \n)
FIREBASE_ADMIN_CLIENT_EMAIL (service account email)
FIREBASE_ADMIN_PROJECT_ID (Firebase project ID)
```

## 🔧 Debugging Strategies
- **Context-based State Management**: AuthContext, BlocksContext, WorkspaceContext
- **Custom Hooks**: useBlocks, useBlockLogic, useBlockSaving for logic separation
- **Component Composition**: Separate UI components from business logic
- **Type Safety**: Comprehensive TypeScript interfaces for all data structures

## 🚀 Development Workflow

### 1. Development Process Flow
```
🔧 DEV/FIX → 🔄 HOT RELOAD → 🧪 TEST UI → 🏗️ BUILD → 📝 COMMIT → 🚀 DEPLOY
```

#### Hot Reload Testing (Primary Validation)
- Always keep `npm run dev` running on stable port (3002)
- Test every change immediately via hot reload
- Monitor browser console for runtime errors
- Use React DevTools for component inspection
- Test critical user flows: typing, drag-drop, auth, real-time sync

#### Build Verification
```bash
npm run build  # Must pass with no errors
npm run lint   # Check code quality
```

### 2. TypeScript Best Practices

#### Always Use Proper Types
```typescript
// ✅ Good: Proper interface definition
interface BlockProps {
  block: Block;
  isSelected: boolean;
  onUpdate: (blockId: string, updates: Partial<Block>) => Promise<void>;
}

// ❌ Avoid: Using 'any' type
const handleUpdate = (data: any) => { ... }
```

#### useRef Initialization
```typescript
// ✅ Good: Always provide initial value
const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
const elementRef = useRef<HTMLDivElement>(null);

// ❌ Avoid: Missing initial value
const saveTimeoutRef = useRef<NodeJS.Timeout>();
```

#### Hook Dependencies
```typescript
// ✅ Good: Include all dependencies
const memoizedValue = useCallback(() => {
  return processData(data, config);
}, [data, config]);

// ❌ Avoid: Missing dependencies
const memoizedValue = useCallback(() => {
  return processData(data, config);
}, []); // Missing data, config
```

### 3. Common Build Error Fixes

#### Missing Properties in Types
```typescript
// When adding new required fields to interfaces
interface Block {
  id: string;
  content: string;
  pageId: string; // ← New required field
  // ... other fields
}

// Update all creation sites
const newBlock: Omit<Block, 'id' | 'createdAt' | 'updatedAt'> = {
  content,
  pageId, // ← Add missing field
  // ... other fields
};
```

#### Function Return Type Mismatches
```typescript
// ✅ Good: Match expected return type
const moveBlock = async (): Promise<string | null> => {
  const result = await moveBlockToPage(/* params */);
  return result?.id || null; // Extract ID from Block object
};

// ❌ Avoid: Returning wrong type
const moveBlock = async (): Promise<string | null> => {
  return await moveBlockToPage(/* params */); // Returns Block, not string
};
```

## 🧩 Component Development Patterns

### Block Editor Components
```typescript
// Pattern: Separate display logic from business logic
export const Block: React.FC<BlockProps> = ({ block, onUpdate }) => {
  const { handleInput, handleKeyDown } = useBlockLogic({ block, onUpdate });
  
  return (
    <div>
      <EditorContent editor={editor} />
      <TokenChips content={block.content} />
    </div>
  );
};
```

### Context Pattern
```typescript
// Pattern: Provide both state and actions
interface BlocksContextType {
  // State
  blocks: Block[];
  loading: boolean;
  pageId: string;
  
  // Actions
  addBlock: (block: Omit<Block, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateBlockContent: (id: string, updates: Partial<Block>) => Promise<void>;
}
```

### Custom Hooks Pattern
```typescript
// Pattern: Encapsulate complex logic in custom hooks
export const useBlockLogic = ({ block, onUpdate }) => {
  const [localContent, setLocalContent] = useState(block.content);
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  const debouncedSave = useCallback((content: string) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      onUpdate(block.id, { content });
    }, 500);
  }, [block.id, onUpdate]);
  
  return { localContent, handleInput, handleKeyDown };
};
```

## 🔥 Firebase Integration Best Practices

### Error Handling
```typescript
// ✅ Good: Comprehensive error handling
export const createBlock = async (userId: string, pageId: string, block: Partial<Block>) => {
  if (!userId || !pageId) {
    throw new Error('Missing required parameters');
  }
  
  try {
    const blocksRef = collection(db, 'users', userId, 'pages', pageId, 'blocks');
    const docRef = await addDoc(blocksRef, {
      ...block,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating block:', error);
    throw error;
  }
};
```

### Real-time Subscriptions
```typescript
// Pattern: Proper cleanup of Firestore listeners
useEffect(() => {
  if (!user || !pageId) return;
  
  const unsubscribe = subscribeToBlocks(user.uid, pageId, (blocks) => {
    setBlocks(blocks);
  });
  
  return () => unsubscribe(); // Always cleanup
}, [user, pageId]);
```

### Security Rules Validation
```javascript
// Always validate user ownership
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/blocks/{blockId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🎯 Performance Optimization

### React Optimization
```typescript
// Memoize expensive computations
const filteredBlocks = useMemo(() => 
  blocks.filter(block => block.type === selectedType), 
  [blocks, selectedType]
);

// Optimize re-renders
const MemoizedBlock = React.memo(Block, (prevProps, nextProps) => 
  prevProps.block.id === nextProps.block.id && 
  prevProps.isSelected === nextProps.isSelected
);
```

### Editor Performance
```typescript
// Prevent content flashing in TipTap
const lastEditorTextRef = useRef<string>(block.content);

useEffect(() => {
  if (!editor) return;
  // Only update if content changed externally
  if (block.content !== lastEditorTextRef.current) {
    editor.commands.setContent(block.content, { emitUpdate: false });
    lastEditorTextRef.current = block.content;
  }
}, [block.content, editor]);
```

## 🚨 Common Issues & Solutions

### 1. Input Flashing/Cursor Jumping
**Problem**: Editor content resets on every keystroke
**Solution**: Track local content and prevent external updates during typing
```typescript
const [localContent, setLocalContent] = useState(block.content);
const lastEditorTextRef = useRef<string>(block.content);

const handleUpdate = ({ editor }) => {
  const content = editor.getText();
  lastEditorTextRef.current = content; // Prevent external reset
  debouncedSave(content);
};
```

### 2. Build Errors: Missing Dependencies
**Problem**: React Hook dependency warnings
**Solution**: Always include all referenced variables in dependency arrays
```typescript
// Add all variables used inside the callback
useCallback(() => {
  doSomething(value1, value2);
}, [value1, value2]);
```

### 3. TypeScript Compilation Errors
**Problem**: Type mismatches in function returns
**Solution**: Ensure return types match interface definitions
```typescript
// Check what the function actually returns vs what's expected
const result = await someFunction(); // Returns Block
return result.id; // Extract the needed property
```

### 4. Firebase Admin SDK in Production
**Problem**: Missing credentials in Vercel deployment
**Solution**: Set up environment variables for production
```bash
# In Vercel dashboard, add these environment variables:
FIREBASE_ADMIN_PRIVATE_KEY
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PROJECT_ID
```

## 📦 Deployment Best Practices

### Pre-deployment Checklist
```bash
# 1. Build check
npm run build
npm run lint

# 2. Test critical flows
# - Authentication
# - Block creation/editing
# - Real-time sync
# - Drag and drop

# 3. Deploy to Vercel
vercel --prod
```

### Environment Variables
```env
# Development (.env.local)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Production (Vercel)
FIREBASE_ADMIN_PRIVATE_KEY=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PROJECT_ID=
```

## ⚡ Vercel Build Success Practices

### Critical Build Error Patterns & Fixes

#### 1. TypeScript Compilation Errors
**Always fix these before deployment:**

```typescript
// ❌ Missing required properties
const baseBlock: Omit<Block, 'id' | 'createdAt' | 'updatedAt'> = {
  type,
  content,
  indentLevel,
  order
  // Missing pageId! Will cause build failure
};

// ✅ Include all required properties
const baseBlock: Omit<Block, 'id' | 'createdAt' | 'updatedAt'> = {
  type,
  content,
  indentLevel,
  order,
  pageId  // ✓ All required fields present
};
```

#### 2. useRef Initialization Errors
```typescript
// ❌ Will fail in Vercel build
const saveTimeoutRef = useRef<NodeJS.Timeout>();

// ✅ Always provide initial value
const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
const elementRef = useRef<HTMLDivElement>(null);
```

#### 3. Hook Dependency Warnings
```typescript
// ❌ Will cause build warnings/errors
const loadData = async () => {
  // Uses external variables
  fetchData(userId, pageId);
};

useEffect(() => {
  loadData();
}, []); // Missing dependencies!

// ✅ Fix with useCallback and proper dependencies
const loadData = useCallback(async () => {
  fetchData(userId, pageId);
}, [userId, pageId]);

useEffect(() => {
  loadData();
}, [loadData]);
```

#### 4. Return Type Mismatches
```typescript
// ❌ Function returns wrong type
const moveBlock = async (): Promise<string | null> => {
  const result = await moveBlockToPage(/* params */);
  return result; // Returns Block, but Promise expects string | null
};

// ✅ Extract the correct property
const moveBlock = async (): Promise<string | null> => {
  const result = await moveBlockToPage(/* params */);
  return result?.id || null; // Extract ID from Block object
};
```

#### 5. Missing Imports
```typescript
// ❌ Using without import
const memoizedValue = useCallback(() => {
  // ...
}, []);

// ✅ Import all React hooks
import React, { useState, useEffect, useCallback } from 'react';
```

### Vercel-Specific Build Checks

#### Pre-deployment Validation
```bash
# 1. Local build must pass completely
npm run build
# Look for: ✓ Compiled successfully
# No red errors allowed, warnings are acceptable

# 2. Check for TypeScript errors
npx tsc --noEmit

# 3. Lint check
npm run lint
# Fix all errors, warnings are acceptable for deployment
```

#### Environment Variables Setup
```bash
# In Vercel Dashboard → Project → Settings → Environment Variables

# Required for Firebase Admin (Production only)
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_CLIENT_EMAIL="firebase-adminsdk-***@***.iam.gserviceaccount.com"
FIREBASE_ADMIN_PROJECT_ID="your-project-id"

# Required for Firebase Client (All environments)
NEXT_PUBLIC_FIREBASE_API_KEY="AIza***"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="***.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="***"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="***.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="***"
NEXT_PUBLIC_FIREBASE_APP_ID="1:***:web:***"
```

### Build-Time Error Recovery

#### Build Warnings vs Errors
**Critical Understanding**: Vercel deployment distinguishes between warnings and errors
- **Warnings**: Build succeeds, deployment continues (acceptable)
- **Errors**: Build fails, deployment stops (must fix)

```bash
# ✅ Acceptable for deployment (warnings only)
./src/components/workspaces/GTDWorkspace.tsx
30:10  Warning: 'taggedNotes' is assigned a value but never used.  @typescript-eslint/no-unused-vars

# ❌ Blocks deployment (compilation error)
./src/hooks/useBlockLogic.ts:89:26
Type error: Expected 1 arguments, but got 0.
```

#### Handling Acceptable Warnings
```typescript
// For unused variables that you plan to use later
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const [taggedNotes, setTaggedNotes] = useState([]);

// For missing dependencies you intentionally omit
useEffect(() => {
  loadData();
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

#### Common Error Messages & Solutions

**Error**: `Property 'X' is missing in type 'Y'`
```typescript
// Solution: Add missing property to object/interface
interface Block {
  // Add missing property
  pageId: string;
}
```

**Error**: `Expected 1 arguments, but got 0`
```typescript
// Solution: Provide initial value for useRef
const ref = useRef<Type | undefined>(undefined);
```

**Error**: `Type 'X' is not assignable to type 'Y'`
```typescript
// Solution: Check return types and extract needed properties
return someFunction()?.propertyName || null;
```

**Error**: `React Hook has missing dependency`
```typescript
// Solution: Add to dependency array or use useCallback
useEffect(() => {
  someFunction(dependency1, dependency2);
}, [dependency1, dependency2]); // Add all used variables
```

### Deployment Success Checklist

#### Before Running `vercel --prod`:
- [ ] `npm run build` passes with ✓ Compiled successfully
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] All React Hook dependencies included
- [ ] All useRef hooks have initial values
- [ ] Function return types match interface expectations
- [ ] Environment variables configured in Vercel dashboard
- [ ] Firebase credentials properly formatted

#### During Deployment:
- [ ] Watch build logs for errors
- [ ] Ensure "Compiled successfully" appears
- [ ] Check that static page generation completes
- [ ] Verify no missing dependencies in build output

#### After Deployment:
- [ ] Test deployed URL loads correctly
- [ ] Authentication works in production
- [ ] Firebase operations function properly
- [ ] No console errors in production build

### Build Optimization Tips

#### Reduce Bundle Size
```typescript
// Use dynamic imports for large components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>
});

// Tree-shake unused Firebase imports
import { collection, doc, addDoc } from 'firebase/firestore';
// Don't import entire firebase/firestore
```

#### Optimize Build Performance
```javascript
// next.config.js
module.exports = {
  experimental: {
    // Enable SWC minification
    swcMinify: true,
  },
  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
  },
};
```

## 🔧 Debugging Strategies

### Hot Reload Debugging
```typescript
// Use structured logging for debugging
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('Block operation:', { 
    operation: 'update', 
    blockId, 
    userId, 
    timestamp: new Date().toISOString() 
  });
}
```

### Browser DevTools Checklist
- **Console**: No red errors (warnings acceptable)
- **Network**: Firebase requests completing successfully (200 status)
- **Application**: LocalStorage/IndexedDB for Firebase auth
- **Performance**: No memory leaks during extended use

### Common Debug Commands
```bash
# Clear build cache
rm -rf .next
npm run dev

# Check specific port
npm run dev -- --port 3001

# Verbose build output
npm run build -- --debug
```

## 🎨 UI/UX Best Practices

### Responsive Design
```css
/* Mobile-first approach */
.block-container {
  @apply px-2 py-1;
}

@screen md {
  .block-container {
    @apply px-4 py-2;
  }
}
```

### Accessibility
```typescript
// Always include ARIA labels
<button
  aria-label="Toggle todo item"
  onClick={handleToggle}
  className="focus:ring-2 focus:ring-blue-500"
>
  {isChecked ? '✓' : '○'}
</button>
```

### Loading States
```typescript
// Provide feedback for async operations
{loading ? (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
  </div>
) : (
  <Block {...props} />
)}
```

## 🗄️ Database Migration Strategies

### Schema Evolution Best Practices
When modifying Firestore structure, follow these patterns to avoid breaking existing data:

#### 1. Adding New Fields
```typescript
// Safe: New fields with defaults
interface Block {
  // Existing fields
  id: string;
  content: string;
  // New field with migration handling
  tags?: string[]; // Optional initially
}

// Migration function for existing documents
const migrateBlocks = async (userId: string) => {
  const blocksRef = collection(db, 'users', userId, 'blocks');
  const snapshot = await getDocs(blocksRef);
  
  const batch = writeBatch(db);
  snapshot.docs.forEach(doc => {
    if (!doc.data().tags) {
      batch.update(doc.ref, { tags: [] });
    }
  });
  
  await batch.commit();
};
```

#### 2. Renaming Fields
```typescript
// Step 1: Add new field, keep old field
interface Block {
  content: string; // Old field
  richContent?: string; // New field
}

// Step 2: Migration script
const migrateContentField = async () => {
  // Read old field, write to new field
  batch.update(docRef, {
    richContent: doc.data().content,
    content: deleteField() // Remove old field after migration
  });
};
```

#### 3. Changing Data Structure
```typescript
// From flat structure to nested
// Old: { userId, blockId, content }
// New: { userId, pages: { pageId: { blocks: { blockId, content } } } }

const migrateToNestedStructure = async () => {
  // 1. Read all old documents
  // 2. Transform to new structure
  // 3. Write to new collection
  // 4. Verify data integrity
  // 5. Update app to use new structure
  // 6. Delete old collection after verification
};
```

#### 4. Safe Migration Checklist
- [ ] Create backup before migration
- [ ] Test migration on development data
- [ ] Implement rollback mechanism
- [ ] Update security rules for new structure
- [ ] Deploy backend changes before frontend
- [ ] Monitor for errors during migration
- [ ] Keep old data for 30 days minimum

### Firestore Index Management
```javascript
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "blocks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## 📊 Production Monitoring & Error Tracking

### Error Boundary Implementation
```typescript
// components/ErrorBoundary.tsx
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({error, resetErrorBoundary}) {
  // Log to monitoring service
  if (typeof window !== 'undefined') {
    console.error('Application Error:', error);
    // Send to monitoring service (Sentry, LogRocket, etc.)
  }
  
  return (
    <div role="alert" className="error-boundary">
      <h2>Something went wrong</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

// Wrap app with error boundary
<ErrorBoundary FallbackComponent={ErrorFallback}>
  <App />
</ErrorBoundary>
```

### Performance Monitoring
```typescript
// utils/performance.ts
export const measurePerformance = (metricName: string) => {
  if (typeof window !== 'undefined' && window.performance) {
    const startMark = `${metricName}-start`;
    const endMark = `${metricName}-end`;
    
    performance.mark(startMark);
    
    return () => {
      performance.mark(endMark);
      performance.measure(metricName, startMark, endMark);
      
      const measure = performance.getEntriesByName(metricName)[0];
      console.log(`${metricName}: ${measure.duration}ms`);
      
      // Send to analytics
      if (window.gtag) {
        window.gtag('event', 'timing_complete', {
          name: metricName,
          value: Math.round(measure.duration)
        });
      }
    };
  }
  return () => {};
};

// Usage
const endMeasure = measurePerformance('block-render');
// ... render logic
endMeasure();
```

### Firebase Performance Monitoring
```typescript
// lib/monitoring.ts
import { getPerformance } from 'firebase/performance';

const perf = getPerformance();

// Custom traces
export const traceAsyncOperation = async (name: string, operation: () => Promise<any>) => {
  const trace = perf.trace(name);
  trace.start();
  
  try {
    const result = await operation();
    trace.putMetric('success', 1);
    return result;
  } catch (error) {
    trace.putMetric('error', 1);
    throw error;
  } finally {
    trace.stop();
  }
};
```

### User Analytics Events
```typescript
// Key events to track
const analytics = {
  // User actions
  blockCreated: (blockType: string) => logEvent('block_created', { type: blockType }),
  blockDeleted: () => logEvent('block_deleted'),
  pageCreated: () => logEvent('page_created'),
  
  // Performance metrics
  loadTime: (duration: number) => logEvent('page_load_time', { duration }),
  saveTime: (duration: number) => logEvent('save_time', { duration }),
  
  // Errors
  saveError: (error: string) => logEvent('save_error', { error_message: error }),
  syncError: (error: string) => logEvent('sync_error', { error_message: error })
};
```

## 📚 Code Organization

### File Structure
```
src/
├── app/                 # Next.js app router pages
├── components/
│   ├── editor/         # Core editor components
│   ├── ui/             # Reusable UI components
│   └── workspaces/     # Workspace-specific components
├── contexts/           # React contexts
├── hooks/              # Custom hooks
├── lib/                # Utilities and Firebase functions
├── types/              # TypeScript type definitions
└── utils/              # Helper functions
```

### Import Organization
```typescript
// 1. React imports
import React, { useState, useEffect, useCallback } from 'react';

// 2. Third-party imports
import { collection, addDoc } from 'firebase/firestore';
import clsx from 'clsx';

// 3. Internal imports
import { Block, BlockType } from '@/types/index';
import { useBlocks } from '@/contexts/BlocksContext';
import { Button } from '@/components/ui/Button';
```

## 🧪 Testing Strategies

### Manual Testing Checklist
- [ ] User authentication (login/logout)
- [ ] Page creation and navigation
- [ ] Block creation, editing, deletion
- [ ] Drag and drop functionality
- [ ] Real-time collaboration
- [ ] Archive/restore functionality
- [ ] Mobile responsiveness

### Performance Testing
- [ ] Bundle size analysis
- [ ] Lighthouse audit score > 90
- [ ] Firebase read/write optimization
- [ ] Memory leak detection

## 🚀 Advanced Patterns

### Cross-Page Drag and Drop
```typescript
// Pattern: Use global context for complex interactions
const { draggedBlock, setDraggedBlock } = useGlobalDrag();

const handleDrop = async (targetPageId: string) => {
  if (!draggedBlock) return;
  
  const newBlockId = await moveBlockToPage(
    draggedBlock.sourcePageId,
    targetPageId,
    draggedBlock.blockId
  );
  
  setDraggedBlock(null);
  return newBlockId;
};
```

### AI Integration
```typescript
// Pattern: Streaming responses for better UX
const streamAIResponse = async (prompt: string) => {
  const response = await fetch('/api/ai/vertex', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: prompt, stream: true })
  });
  
  const reader = response.body?.getReader();
  // Handle streaming response...
};
```

## 📝 Documentation Standards

### Function Documentation
```typescript
/**
 * Creates a new block in the specified page
 * @param userId - The user's unique identifier
 * @param pageId - The page where the block will be created
 * @param block - The block data (without id, createdAt, updatedAt)
 * @returns Promise resolving to the new block's ID
 * @throws Error if userId or pageId is invalid
 */
export const createBlock = async (
  userId: string,
  pageId: string,
  block: Omit<Block, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  // Implementation...
};
```

### Component Documentation
```typescript
/**
 * Block component for rendering individual content blocks
 * 
 * Features:
 * - Rich text editing with TipTap
 * - Drag and drop support
 * - Real-time synchronization
 * - Token chip rendering for @mentions
 * 
 * @param block - The block data to render
 * @param isSelected - Whether this block is currently selected
 * @param onUpdate - Callback for block content updates
 */
export const Block: React.FC<BlockProps> = ({ ... }) => {
  // Implementation...
};
```

## 🔄 Version Control Best Practices

### Commit Message Format
```
feat: add drag-and-drop for cross-page block movement
fix: resolve input flashing in TipTap editor
refactor: extract block logic into custom hook
docs: update development workflow documentation
```

### Branch Strategy
- `main` - Production-ready code
- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `refactor/component-name` - Code improvements

### Safe vs Risky Changes
**Safe to commit directly to main:**
- UI polish and styling improvements
- Bug fixes that don't affect core functionality
- Documentation updates
- Adding new utility functions

**Require feature branches:**
- Firebase schema changes
- Major architectural refactoring
- Breaking API changes
- New authentication providers

## 🔧 Critical Commands Reference

### Development Commands
```bash
# Start development server (ALWAYS on port 3002)
npm run dev

# Build for production (must pass before deployment)
npm run build

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Clean rebuild
rm -rf .next
npm run build
```

### Git Commands
```bash
# Check current state
git status
git diff
git log --oneline -10

# Stage and commit (only when user requests)
git add .
git commit -m "commit message"

# Branch operations
git checkout -b feature/branch-name
git checkout main
git merge feature/branch-name
```

### Firebase Commands
```bash
# Deploy specific services
firebase deploy --only firestore:rules
firebase deploy --only functions
firebase deploy --only hosting

# Emulator for local testing
firebase emulators:start
```

### Vercel Commands
```bash
# Production deployment
vercel --prod

# Preview deployment
vercel

# Rollback
vercel rollback

# Check deployment status
vercel ls
```

## 🚧 Known Limitations & Workarounds

### Current System Limitations

#### 1. TipTap Editor Flashing
**Issue**: Content flashes when typing rapidly
**Workaround**: 
```typescript
// Use local state and ref to prevent external updates
const lastEditorTextRef = useRef<string>(block.content);
// Only update if content changed externally
if (block.content !== lastEditorTextRef.current) {
  editor.commands.setContent(block.content, { emitUpdate: false });
}
```

#### 2. Firebase Real-time Sync Lag
**Issue**: Occasional lag in multi-user scenarios
**Workaround**: Implement optimistic updates
```typescript
// Update UI immediately, sync in background
setLocalContent(newContent);
debouncedSave(newContent); // Sync after delay
```

#### 3. Drag-and-Drop on Mobile
**Issue**: Touch events not fully supported
**Workaround**: Provide alternative UI for mobile
```typescript
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
if (isMobile) {
  // Show move buttons instead of drag handles
}
```

#### 4. Large Document Performance
**Issue**: Slow with 500+ blocks
**Workaround**: Implement virtualization
```typescript
import { FixedSizeList } from 'react-window';
// Render only visible blocks
```

### Browser-Specific Issues

#### Safari
- IndexedDB limitations for offline storage
- CSS Grid issues with certain layouts
- Touch event handling differences

#### Firefox
- Different behavior for contentEditable
- Performance timing API differences

#### Edge
- PWA installation quirks
- Clipboard API restrictions

## 📝 Session Continuity Best Practices

### For Claude/AI Assistants

#### Starting a New Session
1. Read this CLAUDE.md file first
2. Check git status for current state
3. Review recent commits for context
4. Check if dev server is running
5. Review any uncommitted changes

#### Understanding Project State
```bash
# Quick project health check
git status                    # Current changes
git log --oneline -5          # Recent work
npm run build                 # Check for errors
ps aux | grep "npm run dev"   # Is dev server running?
```

#### Maintaining Context
- Always mention file paths with line numbers
- Reference specific component names
- Keep track of what was tested
- Document any temporary workarounds
- Note any pending tasks or issues

### Information to Preserve

#### Current Working State
```typescript
// Document current focus area
const SESSION_CONTEXT = {
  workingOn: "GTD workspace functionality",
  lastTested: "drag and drop between pages",
  pendingIssues: ["mobile responsiveness", "performance optimization"],
  nextSteps: ["implement archive recovery", "add search functionality"]
};
```

#### Key Decisions Made
- Using TipTap for rich text editing
- Firebase for real-time sync
- Context API over Redux for state management
- Vercel for deployment
- No SSR for editor pages (client-side only)

## 🎪 Project-Specific Quirks & Gotchas

### Notion-Lite Specific Behaviors

#### 1. Block ID Generation
```typescript
// IDs are Firebase auto-generated, not UUIDs
// Never generate IDs client-side
const docRef = await addDoc(collection(...), data);
const newId = docRef.id; // Use Firebase's ID
```

#### 2. Page Navigation State
```typescript
// Page context must be updated before blocks load
// Order matters:
// 1. Update pageId in context
// 2. Wait for context update
// 3. Then load blocks
```

#### 3. Editor Focus Management
```typescript
// TipTap manages its own focus
// Don't use React refs for focus
editor.commands.focus(); // Use TipTap's API
```

#### 4. Workspace Types
Each workspace has unique behavior:
- **Note**: Simple hierarchical blocks
- **GTD**: Task-specific with date handling
- **Gallery**: Image-focused with grid layout
- **AI**: Includes Vertex AI integration

#### 5. Authentication Flow
```typescript
// Firebase Auth persistence
// User stays logged in across sessions
// But context needs re-initialization on page load
```

#### 6. Environment Variables
```bash
# Client-side vars MUST start with NEXT_PUBLIC_
NEXT_PUBLIC_FIREBASE_API_KEY=...

# Server-side vars don't need prefix
FIREBASE_ADMIN_PRIVATE_KEY=...
```

#### 7. Build vs Dev Differences
- Dev: More verbose logging
- Dev: Hot reload sometimes needs manual refresh
- Build: Stricter TypeScript checking
- Build: No console.log in production

#### 8. CSS Module Quirks
```css
/* Global styles need :global() wrapper */
:global(.tiptap-editor) {
  /* styles */
}
```

#### 9. Firebase Security Rules
- Rules are separate from code
- Deploy rules separately from functions
- Test rules in Firebase Console first

#### 10. Vercel Deployment
- Environment variables set in dashboard, not .env
- Build command: `npm run build`
- Output directory: `.next`
- Node version: 18.x or higher

---

## 📞 Emergency Procedures

### Production Issues
1. **Immediate**: Rollback to last known good version
2. **Investigation**: Check Firebase console, error logs, user reports
3. **Communication**: Update status, notify users if necessary
4. **Fix**: Address root cause in feature branch
5. **Validation**: Thorough testing before re-deployment

### Quick Rollback
```bash
# Vercel rollback to previous deployment
vercel rollback

# Firebase rules rollback
firebase deploy --only firestore:rules --project production
```

---

*Remember: Stability over speed. Better to deploy fewer, well-tested features than break the user experience with rushed releases.*

---

## 🎯 Next Steps & Future Improvements

### Planned Features
- [ ] Collaborative editing with conflict resolution
- [ ] Advanced AI integration with context awareness
- [ ] Offline support with sync
- [ ] Plugin system for extensibility
- [ ] Advanced search and filtering
- [ ] Export/import functionality

### Technical Debt
- [ ] Add comprehensive unit tests
- [ ] Implement proper error boundaries
- [ ] Optimize bundle size
- [ ] Add performance monitoring
- [ ] Improve accessibility compliance

---

## 🔍 Quick Troubleshooting Guide

### Common Issues & Quick Fixes

| Issue | Solution | Command/Code |
|-------|----------|--------------|
| Build fails with TypeScript errors | Check for missing dependencies, wrong types | `npx tsc --noEmit` |
| Hot reload not working | Restart dev server, clear .next | `rm -rf .next && npm run dev` |
| Firebase permission denied | Check auth state and security rules | Check Firebase Console |
| Vercel deployment fails | Check env vars, build locally first | `npm run build` |
| Editor content disappears | Check block ID consistency | Verify in Firebase Console |
| Drag-drop not working | Check GlobalDragContext provider | Verify context wrapping |
| Login redirect loop | Clear cookies and localStorage | DevTools > Application > Clear |
| Styles not applying | Check Tailwind purge config | Restart dev server |
| API routes 404 | Check file naming and exports | Verify `/app/api` structure |
| Missing environment variables | Check .env.local and Vercel dashboard | Compare both sources |

### Performance Optimization Checklist
- [ ] Enable React.memo for heavy components
- [ ] Implement virtual scrolling for long lists
- [ ] Use dynamic imports for large components
- [ ] Optimize images with next/image
- [ ] Enable SWC minification
- [ ] Implement proper caching strategies
- [ ] Use Firebase compound queries efficiently
- [ ] Batch Firestore writes when possible
- [ ] Debounce search and filter operations
- [ ] Lazy load workspace components

## 💡 Advanced Tips & Tricks

### Firebase Query Optimization
```typescript
// Bad: Multiple queries
const blocks = await getDocs(collection(db, 'blocks'));
const filteredBlocks = blocks.docs.filter(doc => doc.data().userId === userId);

// Good: Compound query
const q = query(
  collection(db, 'blocks'),
  where('userId', '==', userId),
  orderBy('createdAt', 'desc'),
  limit(50)
);
const blocks = await getDocs(q);
```

### State Management Patterns
```typescript
// Use reducer for complex state
const blockReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_BLOCK':
      return [...state, action.payload];
    case 'UPDATE_BLOCK':
      return state.map(block => 
        block.id === action.payload.id ? action.payload : block
      );
    case 'DELETE_BLOCK':
      return state.filter(block => block.id !== action.payload);
    default:
      return state;
  }
};
```

### Custom Hook Patterns
```typescript
// Encapsulate complex logic
const useAutoSave = (content: string, saveFunction: (content: string) => Promise<void>) => {
  const [saving, setSaving] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(async () => {
      setSaving(true);
      await saveFunction(content);
      setSaving(false);
    }, 1000);
    
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [content, saveFunction]);
  
  return saving;
};
```

---

**Last Updated**: August 11, 2025  
**Project Version**: v1.0.0  
**Deployment**: https://notion-lite-weld.vercel.app  
**GitHub**: https://github.com/VuPham289/notion-lite  
**Documentation Version**: 2.0.0

---

*This document is maintained to ensure consistency across development sessions. Update it whenever you discover new patterns, fix critical bugs, or make architectural decisions.*
