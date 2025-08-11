# ⚠️ CRITICAL: Block Saving Mechanism Rules

## DO NOT MODIFY WITHOUT READING THIS FIRST

This document contains the golden standard rules for the block saving mechanism. Violating these rules WILL cause:
- Character flashing while typing
- Lost keystrokes
- "Can't type" issues
- Race conditions between local state and Firestore

## The Golden Rules

### 1. Local State is King 👑
- **ALWAYS** trust `localContent` as the source of truth while user is typing
- **NEVER** overwrite `localContent` with Firestore data while `isTyping.current === true`

### 2. Use Refs for Keyboard Handlers 🔑
```javascript
// ❌ WRONG - Will cause stale closure issues
if (localContent.trim() === '') { ... }

// ✅ CORRECT - Always current value
const currentContent = localContentRef.current || localContent;
if (currentContent.trim() === '') { ... }
```

### 3. The Holy Trinity of State Management 🔺
1. `localContent` - What the user sees and types
2. `lastSavedContent.current` - What we last saved to Firestore
3. `isTyping.current` - Whether user is actively typing

### 4. Debounce is Sacred ⏱️
- **500ms** debounce timeout is optimal
- Do NOT change it to be faster (causes flashing)
- Do NOT change it to be slower (feels laggy)

### 5. The Sync Rule 🔄
Only sync from Firestore when ALL conditions are met:
- `!isComposing` (not in IME input)
- `!isTyping.current` (not actively typing)
- `block.content !== lastSavedContent.current` (actually changed externally)

## Common Mistakes That Break Everything

### ❌ Mistake 1: Using localContent directly in callbacks
```javascript
// This will use stale values
handleKeyDown = () => {
  if (localContent === '') { ... } // WRONG!
}
```

### ❌ Mistake 2: Syncing Firestore immediately
```javascript
useEffect(() => {
  setLocalContent(block.content); // WRONG! Check isTyping first!
}, [block.content]);
```

### ❌ Mistake 3: Adding localContent to dependencies
```javascript
useEffect(() => {
  // Some cleanup
}, [localContent, block.id]); // WRONG! Will cause array size changes
```

### ❌ Mistake 4: Removing the ref pattern
```javascript
// "Let's simplify by removing refs" - NO! This causes stale closures
```

## Testing Checklist

Before modifying the saving mechanism, test ALL of these:
- [ ] Fast typing (100+ WPM)
- [ ] Slow typing with pauses
- [ ] Chinese/Japanese/Korean IME input
- [ ] Copy/paste large blocks of text
- [ ] Switching between pages rapidly
- [ ] Network latency (throttle to 3G)
- [ ] Multiple blocks being edited
- [ ] Enter key creating new blocks
- [ ] Backspace merging blocks

## Files Involved

- `/src/hooks/useBlockLogic.ts` - Main saving logic (DO NOT MODIFY WITHOUT TESTING)
- `/src/components/editor/SimpleBlock.tsx` - Uses the saving logic
- `/src/components/editor/Block.tsx` - Alternative editor (has own saving)

## If You Break It

1. Git revert immediately
2. Re-read this document
3. Test everything in the checklist
4. Make minimal changes
5. Test again

## Remember

**Every developer who touched this before you thought they could "improve" it. They all created bugs. The current implementation works. Don't be clever, be careful.**