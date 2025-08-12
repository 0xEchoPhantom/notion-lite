# Claude Assistant Instructions

## Project Overview
This is Notion Lite - a Notion-like editor built with Next.js, React, TypeScript, and Firebase.

## Key Commands to Run
- **Development**: `npm run dev` - Starts the development server on port 3002
- **Build**: `npm run build` - Creates production build
- **Lint**: `npm run lint` - Runs ESLint to check code quality
- **Type Check**: `npx tsc --noEmit` - Runs TypeScript type checking

## Important Project Structure

### Core Editor Components
- `src/components/editor/SimpleBlock.tsx` - Main block component
- `src/hooks/useBlockLogic.ts` - Block interaction logic (keyboard, slash menu, etc.)
- `src/hooks/useBlocks.ts` - Block CRUD operations and parent-child relationships
- `src/lib/firestore.ts` - Database operations

### Block Types
- `paragraph` - Default text block
- `todo-list` - Checkbox todo items with parent-child relationships
- `bulleted-list` - Bullet point lists
- `numbered-list` - Numbered lists
- `heading-1/2/3` - Header blocks
- `quote` - Quote blocks
- `code` - Code blocks
- `divider` - Horizontal divider

## Recent Feature Implementations

### 1. Sub-Todo System
- Implemented true parent-child relationships for todo items
- Parent todos automatically check when all children are checked
- Dragging parent todo brings all children along
- Data structure uses `taskMetadata.subtaskIds` and `taskMetadata.parentTaskId`

### 2. Drag-and-Drop System
- Parents drag with all their children (both within page and cross-page)
- Batch operations ensure atomic moves
- Smooth animations using CSS transitions
- Visual indicators for drop zones

### 3. Editor Behavior Optimizations
#### Backspace on Empty Blocks:
- Indented blocks → Outdent first
- Todo/List/Heading → Convert to paragraph → Delete
- Paragraph → Delete (unless only block)

#### Enter on Empty List Items:
- Converts to paragraph instead of creating new list item
- Maintains appropriate indentation

### 4. Slash Menu
- Properly clears command text after selection
- Removes entire slash command from content

## Testing Considerations
- Always run `npm run lint` before commits
- Always run `npx tsc --noEmit` for type checking
- Test drag-drop both within page and cross-page
- Test parent-child todo relationships
- Test keyboard shortcuts and block conversions

## Known Issues & Solutions
- **Blocks disappearing after cross-page drag**: Fixed by normalizing page IDs
- **Slash commands not clearing**: Fixed by removing entire command text
- **Blue highlight on focus**: Removed via CSS in globals.css and blockStyles.ts

## Development Notes
- The app runs on `http://localhost:3002`
- Uses Firebase Firestore for real-time data sync
- Uses Tailwind CSS for styling
- TypeScript strict mode is enabled
- React 18+ with App Router (Next.js 14+)

## Critical Files - DO NOT MODIFY WITHOUT CARE
- `src/hooks/useBlockLogic.ts` - Contains golden standard for saving mechanism
- `src/lib/firestore.ts` - Critical database operations
- `src/contexts/BlocksContext.tsx` - Global blocks state management

## Git Workflow
- Main branch: `main`
- Always test locally before pushing
- Commit messages should be descriptive
- Run lint and type checks before committing