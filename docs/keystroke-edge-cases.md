# Keystroke Edge Cases Analysis - Enter/Backspace Block Operations

## 🚨 Current Problems

### Race Condition Issues
1. **Fast Enter**: Multiple blocks created before first completes
2. **Fast Backspace**: Multiple blocks deleted/merged simultaneously  
3. **Enter + Type**: Typing starts before new block is focused
4. **Async Firebase**: Operations overlap before completion
5. **Focus Management**: Trying to focus non-existent elements

## 📋 Complete Edge Case Scenarios

### 1. ENTER KEY SCENARIOS

#### 1.1 Rapid Enter Presses
```
User: [Enter][Enter][Enter] (within 100ms)
Current Problem: 3 blocks created, focus confused
Expected: Only 1 block created, then ignored until complete
```

#### 1.2 Enter + Immediate Typing  
```
User: [Enter]hello world (typing starts immediately)
Current Problem: "hello world" goes to wrong block
Expected: Text waits for new block focus, then appears
```

#### 1.3 Enter at Different Block Types
```
Scenario A: Empty todo-list + Enter
Current: New todo-list created
Expected: ✅ Correct

Scenario B: Empty paragraph + Enter  
Current: New paragraph created
Expected: ✅ Correct

Scenario C: Non-empty block + Enter (cursor at end)
Current: New block created
Expected: ✅ Correct

Scenario D: Non-empty block + Enter (cursor in middle)
Current: Split block content
Problem: May not handle properly with fast keystrokes
```

#### 1.4 Enter + Modifier Keys
```
Shift+Enter: Should add line break, not new block
Ctrl+Enter: Should create new block regardless of position
Alt+Enter: Custom behavior?
```

#### 1.5 Enter During Token Processing
```
User types: "@John[Enter]" quickly
Current Problem: May interrupt @ token processing
Expected: Complete @ processing, then handle Enter
```

#### 1.6 Enter During Async Save
```
User: Types content → [Enter] → (while saving)
Current Problem: New block created before save completes
Expected: Queue Enter until save completes
```

### 2. BACKSPACE SCENARIOS

#### 2.1 Rapid Backspace
```
User: [Backspace][Backspace][Backspace] rapidly
Current Problem: Multiple merge operations
Expected: Debounced, single operation
```

#### 2.2 Backspace at Block Start
```
Scenario A: Empty block + Backspace
Expected: Delete block, focus previous

Scenario B: Non-empty block + Backspace at start  
Expected: Merge with previous block

Scenario C: First block + Backspace
Expected: Do nothing (can't delete/merge)
```

#### 2.3 Backspace + Immediate Typing
```
User: [Backspace]hello (typing immediately after)
Current Problem: Text may go to wrong block
Expected: Wait for merge completion
```

#### 2.4 Backspace Different Block Types
```
Todo-list → Paragraph merge
Paragraph → Todo-list merge  
Heading → Paragraph merge
List → List merge (maintain numbering)
```

### 3. COMBINATION SCENARIOS

#### 3.1 Enter + Backspace Sequence
```
User: [Enter][Backspace] quickly
Expected: Should cancel out (no block created)
```

#### 3.2 Backspace + Enter Sequence
```
User: [Backspace][Enter] quickly  
Expected: Merge, then create new block
```

#### 3.3 Rapid Mixed Operations
```
User: [Enter][Type][Backspace][Enter][Type]
Expected: Each operation completes before next
```

### 4. ASYNC OPERATION SCENARIOS

#### 4.1 Firebase Latency
```
Slow connection: Block creation takes 2 seconds
User continues typing: Should queue operations
```

#### 4.2 Multiple Users
```
User A: Creates block
User B: Deletes block (at same time)
Expected: Conflict resolution
```

#### 4.3 Offline Mode
```
User: Fast keystrokes while offline
Expected: Queue operations, sync when online
```

### 5. FOCUS MANAGEMENT SCENARIOS

#### 5.1 Focus During Animation
```
Block creation includes fade-in animation
User types during animation: Should still work
```

#### 5.2 Focus Lost
```
User clicks outside, then presses Enter
Expected: Should not create blocks
```

#### 5.3 Mobile Focus
```
Virtual keyboard appears/disappears
Focus behavior different on mobile
```

### 6. UNDO/REDO SCENARIOS

#### 6.1 Fast Operations + Undo
```
User: [Enter][Enter][Ctrl+Z] quickly
Expected: Undo last operation correctly
```

#### 6.2 Partial Operations
```
User: [Enter] (while loading) → [Ctrl+Z]
Expected: Handle incomplete operations
```

## 🔧 SOLUTION STRATEGIES

### 1. Operation Locking
```typescript
class BlockOperationLock {
  private locked = false;
  private queue: (() => Promise<void>)[] = [];

  async execute<T>(operation: () => Promise<T>): Promise<T | null> {
    if (this.locked) {
      // Queue operation or ignore based on strategy
      return null;
    }

    this.locked = true;
    try {
      return await operation();
    } finally {
      this.locked = false;
    }
  }
}
```

### 2. Keystroke Debouncing
```typescript
const useKeyboardDebounce = (delay = 50) => {
  const lastKeystroke = useRef<number>(0);
  
  const shouldProcess = () => {
    const now = Date.now();
    const timeSinceLastKeystroke = now - lastKeystroke.current;
    lastKeystroke.current = now;
    return timeSinceLastKeystroke > delay;
  };

  return shouldProcess;
};
```

### 3. State Consistency
```typescript
interface BlockOperationState {
  isCreating: boolean;
  isDeleting: boolean;
  lastOperation: 'enter' | 'backspace' | null;
  operationTimestamp: number;
}
```

### 4. Focus Queue Management
```typescript
class FocusManager {
  private pendingFocus: string | null = null;
  
  async focusBlock(blockId: string): Promise<void> {
    this.pendingFocus = blockId;
    
    // Wait for element to exist
    await this.waitForElement(`[data-block-id="${blockId}"] textarea`);
    
    // Only focus if still the pending focus target
    if (this.pendingFocus === blockId) {
      element.focus();
      this.pendingFocus = null;
    }
  }
}
```

### 5. Input Buffering
```typescript
class InputBuffer {
  private buffer: string = '';
  private targetBlockId: string | null = null;
  
  bufferInput(input: string, blockId: string) {
    if (this.targetBlockId !== blockId) {
      this.flush(); // Flush previous buffer
      this.targetBlockId = blockId;
    }
    this.buffer += input;
  }
  
  async flush() {
    if (this.buffer && this.targetBlockId) {
      await this.applyBufferedInput();
      this.buffer = '';
      this.targetBlockId = null;
    }
  }
}
```

## 🧪 TESTING SCENARIOS

### Automated Tests
```typescript
describe('Keystroke Edge Cases', () => {
  test('rapid enter keystrokes', async () => {
    // Simulate fast Enter presses
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    await waitFor(() => {
      // Should only have 1 new block
      expect(getBlocks()).toHaveLength(initialCount + 1);
    });
  });
  
  test('enter then immediate typing', async () => {
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.change(input, { target: { value: 'hello' } });
    
    await waitFor(() => {
      expect(getNewBlock().content).toBe('hello');
    });
  });
});
```

### Manual Testing Checklist
- [ ] Rapid Enter (hold Enter key)
- [ ] Rapid Backspace (hold Backspace)  
- [ ] Enter + immediate typing
- [ ] Backspace + immediate typing
- [ ] Enter/Backspace alternating quickly
- [ ] Operations during slow network
- [ ] Operations while offline
- [ ] Mobile keyboard behavior
- [ ] Focus loss scenarios
- [ ] Undo during operations

## 🎯 IMPLEMENTATION PRIORITY

### P0 - Critical (Breaks user flow)
1. **Operation Locking**: Prevent overlapping async operations
2. **Keystroke Debouncing**: Ignore rapid duplicate keys
3. **Focus Management**: Ensure proper focus after operations

### P1 - High (Poor UX)  
1. **Input Buffering**: Queue typing during transitions
2. **State Consistency**: Keep UI in sync with operations
3. **Error Recovery**: Handle failed operations gracefully

### P2 - Medium (Edge cases)
1. **Offline Handling**: Queue operations when offline
2. **Multi-user Conflicts**: Handle concurrent operations
3. **Animation Coordination**: Smooth visual feedback

### P3 - Low (Nice to have)
1. **Keyboard Shortcuts**: Advanced enter/backspace behaviors
2. **Mobile Optimization**: Touch-specific handling
3. **Performance Metrics**: Track operation timing

## 🔍 SUCCESS METRICS

1. **Zero Duplicate Blocks**: Fast Enter never creates duplicates
2. **Zero Lost Input**: Fast typing never loses characters  
3. **Consistent Focus**: Cursor always in expected location
4. **No State Desync**: UI always matches actual data
5. **Smooth Performance**: Operations feel instant (<50ms perceived)

---

**The goal**: Make block operations feel as solid and predictable as native text editing, regardless of keystroke speed or network conditions.