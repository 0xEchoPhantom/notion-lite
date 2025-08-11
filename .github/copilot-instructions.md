# Copilot Instructions for Notion-Lite Project

## 🎯 AI Assistant Quick Reference (READ FIRST)
When starting development, these are the critical things to know:

### Priority Commands
```bash
# Always check current state first
git status
npm run dev  # Keep running on port 3002

# Before any code changes
npm run build  # Ensure no existing errors
npm run lint   # Check code quality

# After making changes  
npm run build  # Verify no new errors
npm run lint   # Maintain code quality
```

### Critical Context
- **Hot Reload Port**: Always use port 3002 (configured in package.json)
- **Test in Browser**: Always test at http://localhost:3002 before committing
- **TypeScript Strict**: No `any` types allowed - use proper interfaces
- **Firebase Security**: Never commit credentials - use environment variables
- **Build Before Deploy**: `npm run build` must pass before deployment

## Project Overview
This is a Notion-like block editor built with Next.js, React, TypeScript, and Firebase. It features drag-and-drop functionality, real-time collaboration, TipTap rich text editing, AI integration, and an archive system for safe content management.

## Architecture & Tech Stack
- **Frontend**: Next.js 15.4.5, React 18, TypeScript 5.x
- **Backend**: Firebase Firestore, Firebase Auth, Firebase Admin SDK
- **Rich Text**: TipTap editor for block content editing
- **Authentication**: Firebase Auth with Google provider
- **AI Integration**: Google Vertex AI via Firebase
- **Styling**: TailwindCSS with custom components
- **State Management**: React Context (BlocksContext, AuthContext, GlobalDragContext, WorkspaceContext)
- **Deployment**: Vercel with automatic deployments

## Key Components & Structure
```
src/
├── app/                 # Next.js app router pages
├── components/
│   ├── editor/         # Core editor components (Block, Editor, SlashMenu)
│   │   └── block-parts/ # Block-specific components (TokenChips, DragHandle)
│   ├── ui/             # UI components (Archive, Settings, Sidebar)
│   ├── workspaces/     # Workspace components (GTD, Notes)
│   └── tasks/          # Task-related components (SmartView, TaskChips)
├── contexts/           # React contexts for state management
├── hooks/              # Custom hooks (useBlocks, useBlockLogic, useBlockSaving)
├── lib/                # Utilities (firestore.ts, utils.ts, ai/)
├── types/              # TypeScript type definitions
└── firebase/           # Firebase configuration
```

## Development Workflow

### Development Process Flow
```
1. 🔧 DEV/FIX → 2. 🔄 HOT RELOAD → 3. 🧪 TEST UI → 4. 🏗️ BUILD → 5. 📝 COMMIT → 6. 🚀 DEPLOY
```

#### 1. 🔧 **Development Phase**
- Write code, fix bugs, implement features
- Use TypeScript with proper types
- Follow component structure guidelines
- Add error handling for Firebase operations

#### 2. 🔄 **Hot Reload Testing** (Primary Testing)
```bash
# Development server should be running on stable port
npm run dev  # Always uses port 3002 (configured in package.json)
```
- **Test immediately**: Every change shows up via hot reload
- **Manual UI testing**: Click through all affected features
- **Browser console**: Check for runtime errors and warnings
- **React DevTools**: Monitor component state and props
- **Fix issues on the spot**: Don't move to next step until UI is stable

#### 3. 🧪 **Extended Testing** (When Hot Reload looks good)
- Test critical user flows: login, page creation, block editing, drag-and-drop, archiving
- Test on different screen sizes (responsive design)
- Verify Firebase operations work correctly
- Test real-time synchronization between multiple tabs
- Leave app running for 10-15 minutes to catch any delayed errors

#### 4. 🏗️ **Build Verification** (Only after UI is stable)
```bash
npm run build  # Ensure no compilation errors
npm run lint   # Check code quality
```
- **Must pass**: No TypeScript errors, no build failures
- **If build fails**: Go back to step 1, fix issues, repeat process
- **Warnings acceptable**: Build warnings don't block deployment, but errors do

## 🛠️ Critical TypeScript & Build Practices

### Common Build Error Patterns & Fixes

#### 1. useRef Initialization (Critical for Vercel)
```typescript
// ❌ Will fail in Vercel build
const saveTimeoutRef = useRef<NodeJS.Timeout>();

// ✅ Always provide initial value
const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
const elementRef = useRef<HTMLDivElement>(null);
```

#### 2. Missing Required Properties
```typescript
// ❌ Missing required fields will fail build
const baseBlock: Omit<Block, 'id' | 'createdAt' | 'updatedAt'> = {
  type, content, indentLevel, order
  // Missing pageId!
};

// ✅ Include all required properties
const { pageId } = useBlocks();
const baseBlock = { type, content, indentLevel, order, pageId };
```

#### 3. Hook Dependencies
```typescript
// ❌ Missing dependencies cause warnings/errors
const loadData = useCallback(async () => {
  fetchData(userId, pageId);
}, []); // Missing userId, pageId

// ✅ Include all dependencies
const loadData = useCallback(async () => {
  fetchData(userId, pageId);
}, [userId, pageId]);
```

#### 4. Function Return Types
```typescript
// ❌ Type mismatch will fail build
const moveBlock = async (): Promise<string | null> => {
  const result = await moveBlockToPage(/*...*/);
  return result; // Returns Block, but expects string
};

// ✅ Extract the correct property
const moveBlock = async (): Promise<string | null> => {
  const result = await moveBlockToPage(/*...*/);
  return result?.id || null;
};
```

### Build Success Requirements
```bash
# These must all pass for successful deployment:
npm run build  # ✓ Compiled successfully
npx tsc --noEmit  # No TypeScript errors
npm run lint  # Warnings OK, errors must be fixed
```

#### 5. 📝 **Commit** (Only after successful build)
Based on change type:

#### ✅ SAFE TO COMMIT - Small, Stable Changes
```bash
git add .
git commit -m "feat: add block type icon display"
git push origin main
```

**Commit immediately for:**
- UI polish and styling improvements
- New block types or editor features
- Bug fixes that don't affect core functionality
- Documentation updates
- Minor refactoring that passes all tests
- Adding new utility functions
- Updating dependencies (after testing)

#### ⚠️ COMMIT WITH CAUTION - Medium Risk Changes
```bash
# Test thoroughly first, then commit
npm run build  # Ensure no compilation errors
# Manual testing of affected features
git add .
git commit -m "refactor: improve block drag-and-drop logic"
git push origin main
```

**Test extensively before committing:**
- Changes to drag-and-drop logic
- Modifications to Firebase operations
- Context provider updates
- Real-time subscription changes
- Authentication flow modifications
- Archive system changes

#### 🛑 NEVER COMMIT DIRECTLY - High Risk Changes
```bash
# Create feature branch for major changes
git checkout -b feature/major-refactor
# Make changes, test thoroughly
git commit -m "major: complete editor rewrite"
git push origin feature/major-refactor
# Create PR for review
```

**Always use feature branches for:**
- Firebase schema changes
- Major architectural refactoring
- New authentication providers
- Performance optimization overhauls
- Breaking API changes
- Database migration scripts

#### 6. 🚀 **Deploy** (Automatic for dev, manual for production)
- **Development**: Auto-deploys on every commit to main
- **Production**: Only deploy during safe hours with full checklist

### Code Quality Standards
1. **Always use TypeScript** - No `any` types, proper interface definitions
2. **Component Structure**: Functional components with proper prop typing
3. **Error Handling**: Wrap Firebase operations in try-catch blocks
4. **Performance**: Use React.memo, useCallback, useMemo where appropriate
5. **Accessibility**: Include proper ARIA labels and keyboard navigation

### Hot Reload Best Practices
- **Keep dev server running**: `npm run dev` in background terminal (stable port: localhost:3002)
- **Browser DevTools open**: Monitor console for errors during testing
- **Test incrementally**: Don't accumulate many changes before testing
- **Use React DevTools**: Inspect component state and props
- **Network tab**: Monitor Firebase requests/responses

### Port Management
- **Stable port**: Always uses `localhost:3002` (configured in package.json)
- **No automatic port changes**: Dev server won't jump to random ports
- **Port conflicts**: If 3002 is occupied, stop the conflicting process or change the port in package.json
- **Avoid**: Don't use `--port` flag in terminal commands; use package.json configuration instead

### Development Debugging
```bash
# If hot reload breaks, restart dev server
npm run dev  # Will always use port 3002

# If weird caching issues
rm -rf .next
npm run dev

# Port is configured to be stable at 3002
# Only change port if absolutely necessary via package.json
```

### When to Commit

#### ✅ SAFE TO COMMIT - Small, Stable Changes
```bash
git add .
git commit -m "feat: add block type icon display"
git push origin main
```

**Commit immediately for:**
- UI polish and styling improvements
- New block types or editor features
- Bug fixes that don't affect core functionality
- Documentation updates
- Minor refactoring that passes all tests
- Adding new utility functions
- Updating dependencies (after testing)

#### ⚠️ COMMIT WITH CAUTION - Medium Risk Changes
```bash
# Test thoroughly first, then commit
npm run build  # Ensure no compilation errors
# Manual testing of affected features
git add .
git commit -m "refactor: improve block drag-and-drop logic"
git push origin main
```

**Test extensively before committing:**
- Changes to drag-and-drop logic
- Modifications to Firebase operations
- Context provider updates
- Real-time subscription changes
- Authentication flow modifications
- Archive system changes

#### 🛑 NEVER COMMIT DIRECTLY - High Risk Changes
```bash
# Create feature branch for major changes
git checkout -b feature/major-refactor
# Make changes, test thoroughly
git commit -m "major: complete editor rewrite"
git push origin feature/major-refactor
# Create PR for review
```

**Always use feature branches for:**
- Firebase schema changes
- Major architectural refactoring
- New authentication providers
- Performance optimization overhauls
- Breaking API changes
- Database migration scripts

### Deployment Strategy

#### Development Environment
- **Auto-deploy**: Every commit to `main` branch
- **URL**: Development preview URL
- **Firebase**: Use Firebase emulators when possible
- **Purpose**: Feature testing and validation

#### Production Deployment

##### Pre-Deployment Checklist
```bash
# 1. Ensure all tests pass
npm run build
npm run lint

# 2. Test critical user flows
# - User login/logout
# - Page creation and deletion
# - Block editing and drag-and-drop
# - Archive functionality
# - Real-time updates

# 3. Check Firebase rules and indexes
# - Verify firestore.rules are secure
# - Ensure indexes are optimized
# - Test with production data volume

# 4. Performance check
# - Lighthouse audit score > 90
# - Bundle size analysis
# - Firebase read/write optimization
```

##### Deploy to Production
```bash
# Only deploy during low-traffic hours
# Monday-Thursday, 2-4 AM or 10 AM-12 PM

# 1. Tag the release
git tag -a v1.x.x -m "Release v1.x.x: description"

# 2. Deploy Firebase rules first
firebase deploy --only firestore:rules

# 3. Deploy the application
npm run build
firebase deploy --only hosting

# 4. Verify deployment
# - Test critical paths
# - Monitor error rates
# - Check real-time functionality
```

## Firebase Best Practices

### Firestore Operations
```typescript
// ✅ Good: Error handling and validation
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

// ❌ Avoid: No error handling
export const createBlock = async (userId: string, pageId: string, block: any) => {
  const docRef = await addDoc(collection(db, 'users', userId, 'pages', pageId, 'blocks'), block);
  return docRef.id;
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

### Security Rules
- Always validate user authentication: `request.auth != null`
- Ensure users can only access their own data: `request.auth.uid == userId`
- Use specific field validation where necessary
- Test rules with Firebase emulator

## Component Development Guidelines

### Block Components
```typescript
// ✅ Good: Proper typing and error boundaries
interface BlockProps {
  block: Block;
  isSelected: boolean;
  onUpdate: (blockId: string, updates: Partial<Block>) => Promise<void>;
  onDelete: (blockId: string) => Promise<void>;
}

export const Block: React.FC<BlockProps> = ({ block, isSelected, onUpdate, onDelete }) => {
  const handleUpdate = useCallback(async (updates: Partial<Block>) => {
    try {
      await onUpdate(block.id, updates);
    } catch (error) {
      console.error('Failed to update block:', error);
      // Show user-friendly error message
    }
  }, [block.id, onUpdate]);

  // Component implementation...
};
```

### TipTap Editor Best Practices
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

const handleUpdate = ({ editor }) => {
  const content = editor.getText();
  lastEditorTextRef.current = content; // Prevent external reset
  debouncedSave(content);
};
```

### State Management
- Use Context for global state (user auth, current page, drag state)
- Use local state for component-specific data
- Implement optimistic updates for better UX
- Handle loading and error states properly

## Performance Optimization

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

### Firebase Optimization
- Use pagination for large datasets
- Implement proper indexing
- Minimize real-time listeners
- Batch write operations when possible
- Use transactions for atomic operations

## Debugging & Monitoring

### Hot Reload Debugging (Primary Testing Phase)
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

### Common Hot Reload Issues & Fixes
1. **White screen/crash**: Check browser console for errors
2. **Firebase permission denied**: Check authentication state
3. **Infinite re-renders**: Look for missing dependency arrays in useEffect
4. **Stale state**: Clear browser cache or restart dev server
5. **TypeScript errors**: Fix types before continuing

### Browser DevTools Checklist (During Hot Reload Testing)
- **Console**: No red errors, warnings are acceptable
- **Network**: Firebase requests completing successfully (200 status)
- **Application**: LocalStorage/IndexedDB for Firebase auth
- **Performance**: No memory leaks during extended use

### Port Management
- **Stable port**: Always uses `localhost:3002` (configured in package.json)
- **No automatic port changes**: Dev server won't jump to random ports
- **Port conflicts**: If 3002 is occupied, stop the conflicting process or change the port in package.json
- **Avoid**: Don't use `--port` flag in terminal commands; use package.json configuration instead

### Development Debugging
```bash
# If hot reload breaks, restart dev server
npm run dev  # Will always use port 3002

# If weird caching issues
rm -rf .next
npm run dev

# Port is configured to be stable at 3002
# Only change port if absolutely necessary via package.json
```

## 🚀 Deployment & Vercel Best Practices

### Pre-deployment Checklist
```bash
# 1. Ensure all tests pass
npm run build
npm run lint

# 2. Test critical user flows
# - User login/logout
# - Page creation and deletion
# - Block editing and drag-and-drop
# - Archive functionality
# - Real-time updates

# 3. Check Firebase rules and indexes
# - Verify firestore.rules are secure
# - Ensure indexes are optimized
# - Test with production data volume

# 4. Performance check
# - Lighthouse audit score > 90
# - Bundle size analysis
# - Firebase read/write optimization
```

### Vercel Build Success Requirements
```bash
# These must all pass for successful deployment:
npm run build  # ✓ Compiled successfully
npx tsc --noEmit  # No TypeScript errors
npm run lint  # Warnings OK, errors must be fixed

# Deploy to Vercel
vercel --prod
```

### Environment Variables Setup
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

### Common Deployment Issues & Solutions

#### Build Warnings vs Errors
- **Warnings**: Build succeeds, deployment continues (acceptable)
- **Errors**: Build fails, deployment stops (must fix)

```typescript
// Acceptable warning (doesn't block deployment)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const [taggedNotes, setTaggedNotes] = useState([]);

// Critical error (blocks deployment)
const saveTimeoutRef = useRef<NodeJS.Timeout>(); // Missing initial value
```

#### Firebase Admin SDK in Production
```
# Expected in Vercel logs (not errors):
No Firebase Admin credentials found. Admin SDK will not be available.
Failed to initialize Firebase Admin SDK: Error: Missing Firebase Admin credentials

# Solution: Add environment variables in Vercel dashboard
```

## Code Quality Standards
1. **Always use TypeScript** - No `any` types, proper interface definitions
2. **Component Structure**: Functional components with proper prop typing
3. **Error Handling**: Wrap Firebase operations in try-catch blocks
4. **Performance**: Use React.memo, useCallback, useMemo where appropriate
5. **Accessibility**: Include proper ARIA labels and keyboard navigation

### Hot Reload Best Practices
- **Keep dev server running**: `npm run dev` in background terminal (stable port: localhost:3002)
- **Browser DevTools open**: Monitor console for errors during testing
- **Test incrementally**: Don't accumulate many changes before testing
- **Use React DevTools**: Inspect component state and props
- **Network tab**: Monitor Firebase requests/responses

### When to Commit

#### ✅ SAFE TO COMMIT - Small, Stable Changes
```bash
git add .
git commit -m "feat: add block type icon display"
git push origin main
```

**Commit immediately for:**
- UI polish and styling improvements
- New block types or editor features
- Bug fixes that don't affect core functionality
- Documentation updates
- Minor refactoring that passes all tests
- Adding new utility functions
- Updating dependencies (after testing)

#### ⚠️ COMMIT WITH CAUTION - Medium Risk Changes
```bash
# Test thoroughly first, then commit
npm run build  # Ensure no compilation errors
# Manual testing of affected features
git add .
git commit -m "refactor: improve block drag-and-drop logic"
git push origin main
```

**Test extensively before committing:**
- Changes to drag-and-drop logic
- Modifications to Firebase operations
- Context provider updates
- Real-time subscription changes
- Authentication flow modifications
- Archive system changes

#### 🛑 NEVER COMMIT DIRECTLY - High Risk Changes
```bash
# Create feature branch for major changes
git checkout -b feature/major-refactor
# Make changes, test thoroughly
git commit -m "major: complete editor rewrite"
git push origin feature/major-refactor
# Create PR for review
```

**Always use feature branches for:**
- Firebase schema changes
- Major architectural refactoring
- New authentication providers
- Performance optimization overhauls
- Breaking API changes
- Database migration scripts

### Deployment Strategy

#### Development Environment
- **Auto-deploy**: Every commit to `main` branch
- **URL**: Development preview URL
- **Firebase**: Use Firebase emulators when possible
- **Purpose**: Feature testing and validation

#### Production Deployment

##### Deploy to Production
```bash
# Only deploy during low-traffic hours
# Monday-Thursday, 2-4 AM or 10 AM-12 PM

# 1. Tag the release
git tag -a v1.x.x -m "Release v1.x.x: description"

# 2. Deploy Firebase rules first
firebase deploy --only firestore:rules

# 3. Deploy the application
npm run build
firebase deploy --only hosting

# 4. Verify deployment
# - Test critical paths
# - Monitor error rates
# - Check real-time functionality
```

## Todo List Management
```

## Security Considerations

### Client-Side
- Never expose sensitive Firebase config
- Validate all user inputs
- Sanitize content before display
- Implement proper CORS policies

### Server-Side (Firestore Rules)
- Implement role-based access control
- Validate data structure and types
- Rate limit operations to prevent abuse
- Audit access patterns regularly

## Release Management

### Version Naming
- `v1.0.x` - Bug fixes and minor updates
- `v1.x.0` - New features and improvements  
- `vx.0.0` - Major releases with breaking changes

### Rollback Strategy
```bash
# Quick rollback if issues detected
firebase hosting:clone SOURCE_SITE_ID:SOURCE_VERSION_ID TARGET_SITE_ID

# Database rollback (if needed)
# Restore from Firestore backup
# Update security rules if necessary
```

## Todo List Management

### Priority Levels
1. **P0 - Critical**: Security issues, data loss bugs, authentication failures
2. **P1 - High**: Core functionality broken, performance degradation
3. **P2 - Medium**: Feature improvements, UI enhancements
4. **P3 - Low**: Nice-to-have features, code cleanup

### Feature Development Process
1. Create GitHub issue with detailed requirements
2. Break down into smaller, testable tasks
3. Create feature branch for complex changes
4. Implement with proper testing
5. Code review (if team member available)
6. Deploy to staging/preview
7. User acceptance testing
8. Deploy to production during safe hours
9. Monitor and validate functionality

## Emergency Procedures

### Production Issues
1. **Immediate**: Rollback to last known good version
2. **Investigation**: Check Firebase console, error logs, user reports
3. **Communication**: Update status page, notify users if necessary
4. **Fix**: Address root cause in feature branch
5. **Validation**: Thorough testing before re-deployment
6. **Post-mortem**: Document lessons learned

Remember: **Stability over speed**. It's better to deploy fewer, well-tested features than to break the user experience with rushed releases.
