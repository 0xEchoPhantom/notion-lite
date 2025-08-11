# @ Token System - Complete Use Case Analysis & Bug Prevention

## 🎯 Core Intention
The @ system should work like Notion - intelligent, predictable, and seamless. Users should be able to quickly assign metadata to tasks without thinking about the underlying system.

## 1. INPUT SCENARIOS

### 1.1 Single @ Token Input
```
User types: "Review proposal @John"
Expected: John added as assignee, "@John" removed from text
Current Bug Risk: ✅ Handled
```

### 1.2 Multiple @ Tokens in Same Block
```
User types: "Meeting @John @10k @2h @ACME @2024-12-25"
Expected: All tokens parsed and applied
Current Bug Risk: ❌ Only last @ is processed
FIX NEEDED: Process all @ tokens, not just the last one
```

### 1.3 @ Token at Different Positions
```
Start: "@John needs to review"
Middle: "Send @John the report"  
End: "Report for @John"
Expected: All work the same
Current Bug Risk: ⚠️ May have cursor position issues
```

### 1.4 Editing Existing @ Tokens
```
Scenario 1: User has "@John" → changes to "@Sarah"
Expected: Remove John, add Sarah
Current Bug Risk: ❌ May duplicate or not update properly

Scenario 2: User deletes @ from "@John" → "John"
Expected: Remove assignee metadata
Current Bug Risk: ❌ Metadata remains

Scenario 3: User adds @ to existing text "John" → "@John"
Expected: Trigger menu, add metadata
Current Bug Risk: ⚠️ May not detect properly
```

### 1.5 Copy-Paste Scenarios
```
Scenario 1: Copy text with @tokens from another block
Expected: Parse and apply tokens
Current Bug Risk: ❌ Tokens remain as text

Scenario 2: Copy from external source "@John @10k"
Expected: Detect and offer to parse
Current Bug Risk: ❌ Not detected

Scenario 3: Paste over existing @token
Expected: Replace metadata
Current Bug Risk: ❌ May duplicate
```

### 1.6 Special Characters & Edge Cases
```
"@John's report" - Apostrophe
"@John-Smith" - Hyphen
"@John_Smith" - Underscore
"@John.Smith" - Period
"@João" - Accented characters
"@王明" - Non-Latin characters
"@John123" - Numbers
"@123" - Only numbers
"@@John" - Double @
"@ John" - Space after @
"@" - Just @ symbol
"email@domain.com" - Email addresses
```

### 1.7 Case Sensitivity Issues
```
User has configured: "John"
User types: "@john", "@JOHN", "@JoHn"
Expected: All match to "John"
Current Bug Risk: ⚠️ Partial handling
```

## 2. DATA CONSISTENCY SCENARIOS

### 2.1 Token Manager ↔ @ Menu Sync
```
Scenario 1: Add "Alice" in Token Manager
Expected: Immediately available in @ menu
Current: ✅ Working

Scenario 2: Remove "Alice" from Token Manager
Expected: Still in history but lower priority
Current: ✅ Working

Scenario 3: Rename in Token Manager
Expected: Old name in history, new name prioritized
Current Bug Risk: ❌ No rename function

Scenario 4: Bulk import to Token Manager
Expected: All available in @ menu
Current Bug Risk: ❌ No bulk import
```

### 2.2 Historical Data Handling
```
Scenario 1: Value used 100 times, removed from Manager
Expected: Still suggested, marked as historical
Current: ✅ Working

Scenario 2: Conflicting historical and configured
Expected: Configured takes precedence
Current: ✅ Working

Scenario 3: Clean up old historical data
Expected: Remove unused after X days
Current Bug Risk: ❌ No cleanup mechanism
```

### 2.3 Cross-Page Token References
```
Scenario 1: @John assigned in Page A, view in Page B
Expected: Consistent across pages
Current: ✅ Working

Scenario 2: Delete assignee used across multiple pages
Expected: Warn user or keep in history
Current Bug Risk: ❌ No warning system
```

## 3. UI/UX SCENARIOS

### 3.1 Menu Behavior
```
Scenario 1: Type @J
Expected: Show all J* matches
Current: ✅ Working

Scenario 2: Type @123
Expected: Detect as value, show relevant options
Current: ✅ Working

Scenario 3: Fast typing @John[Enter]
Expected: Process correctly even if menu hasn't loaded
Current Bug Risk: ❌ Race condition possible

Scenario 4: Click outside menu
Expected: Cancel and remove incomplete @
Current: ✅ Working

Scenario 5: Navigate with arrows
Expected: Smooth navigation
Current: ✅ Working
```

### 3.2 Visual Feedback
```
Scenario 1: Hover over chip
Expected: Show full details/tooltip
Current Bug Risk: ❌ No tooltips

Scenario 2: Click on chip
Expected: Edit or remove option
Current Bug Risk: ❌ Not interactive

Scenario 3: Drag chip to reorder
Expected: Reorder metadata
Current Bug Risk: ❌ Not implemented
```

### 3.3 Undo/Redo
```
Scenario 1: Undo after adding @token
Expected: Remove token and restore text
Current Bug Risk: ❌ Not tracked in undo stack

Scenario 2: Redo token addition
Expected: Re-apply token
Current Bug Risk: ❌ Not implemented
```

## 4. PERFORMANCE SCENARIOS

### 4.1 Large Data Sets
```
Scenario 1: 1000+ assignees in Token Manager
Expected: Fast search, pagination
Current Bug Risk: ❌ May be slow

Scenario 2: 10000+ historical entries
Expected: Efficient querying
Current Bug Risk: ❌ No pagination

Scenario 3: Type @a (matches 500 items)
Expected: Show top 10, indicate more
Current Bug Risk: ⚠️ Shows limited but no indication
```

### 4.2 Concurrent Updates
```
Scenario 1: Two users edit same block with @tokens
Expected: Merge conflicts handled
Current Bug Risk: ❌ Last write wins

Scenario 2: Token Manager updated while @ menu open
Expected: Refresh suggestions
Current Bug Risk: ❌ Stale data
```

## 5. ERROR SCENARIOS

### 5.1 Network Issues
```
Scenario 1: Add @token while offline
Expected: Queue for sync
Current Bug Risk: ❌ May fail silently

Scenario 2: Token Manager save fails
Expected: Retry with user feedback
Current Bug Risk: ⚠️ Shows error but no retry
```

### 5.2 Data Validation
```
Scenario 1: @999999999999999 (value too large)
Expected: Validate and warn
Current Bug Risk: ❌ No validation

Scenario 2: @-100 (negative value)
Expected: Handle or reject with message
Current Bug Risk: ❌ No validation

Scenario 3: @0h (zero effort)
Expected: Validate
Current Bug Risk: ❌ No validation
```

### 5.3 Data Corruption
```
Scenario 1: Malformed token in database
Expected: Graceful handling
Current Bug Risk: ❌ May crash

Scenario 2: Circular references
Expected: Detect and prevent
Current Bug Risk: ❌ Not checked
```

## 6. ADVANCED USE CASES

### 6.1 Formulas and Calculations
```
Future: "@total = @value1 + @value2"
Future: "@deadline = @today + @effort"
Future: Aggregate tokens across blocks
```

### 6.2 Token Chaining
```
Future: "@John.email" - Access properties
Future: "@Project1.tasks" - Navigate hierarchies
Future: "@if(value > 10k, John, Sarah)" - Conditionals
```

### 6.3 Custom Token Types
```
Future: @priority:high
Future: @status:in-progress
Future: @tag:urgent
Future: User-defined token types
```

### 6.4 Integration Points
```
Future: @slack:channel
Future: @calendar:event
Future: @github:issue
Future: External service tokens
```

## 7. MIGRATION & COMPATIBILITY

### 7.1 Legacy Data
```
Scenario: User has old format data
Expected: Auto-migrate on first use
Current Bug Risk: ❌ No migration path
```

### 7.2 Import/Export
```
Scenario 1: Export with @tokens
Expected: Preserve metadata
Current Bug Risk: ❌ Not implemented

Scenario 2: Import from Notion
Expected: Parse Notion's @ format
Current Bug Risk: ❌ Not implemented
```

## 8. CRITICAL BUGS TO FIX NOW

### 🔴 P0 - Critical (Breaks core functionality)
1. **Multiple @ tokens in same block not processed**
   - Only last @ is handled
   - Need to process all @ tokens sequentially

2. **Editing existing @ tokens doesn't update metadata**
   - Changing @John to @Sarah doesn't update
   - Deleting @ doesn't remove metadata

3. **Race condition in fast typing**
   - @John[Enter] before menu loads
   - Need queuing mechanism

### 🟠 P1 - High (Poor user experience)
1. **No undo/redo for @ tokens**
   - Can't undo token addition
   - Breaks expected behavior

2. **Copy/paste doesn't parse @ tokens**
   - Tokens remain as plain text
   - Need paste handler

3. **No validation for values**
   - Accepts invalid numbers
   - No range checking

### 🟡 P2 - Medium (Missing features)
1. **No bulk operations**
   - Can't rename assignees globally
   - No bulk import to Token Manager

2. **Chips aren't interactive**
   - Can't click to edit
   - No tooltips

3. **No cleanup mechanism**
   - Historical data grows forever
   - Need periodic cleanup

## 9. IMPLEMENTATION PRIORITIES

### Phase 1: Fix Critical Bugs (This Week)
```typescript
// 1. Handle multiple @ tokens
function parseAllTokens(content: string) {
  const tokens = content.matchAll(/@(\w+)/g);
  for (const token of tokens) {
    processToken(token);
  }
}

// 2. Track @ positions for proper editing
interface TokenPosition {
  start: number;
  end: number;
  value: string;
  type: TokenType;
}

// 3. Implement undo/redo
interface TokenAction {
  type: 'add' | 'remove' | 'update';
  oldValue?: TokenData;
  newValue?: TokenData;
}
```

### Phase 2: Enhance UX (Next Week)
- Interactive chips
- Better visual feedback
- Paste handling
- Validation

### Phase 3: Scale & Performance (Month 2)
- Pagination
- Caching
- Batch operations
- Cleanup jobs

### Phase 4: Advanced Features (Month 3)
- Custom token types
- Formulas
- External integrations
- Import/export

## 10. TESTING CHECKLIST

### Manual Testing
- [ ] Type single @ token
- [ ] Type multiple @ tokens
- [ ] Edit existing @ token
- [ ] Delete @ from token
- [ ] Copy/paste with tokens
- [ ] Fast typing @John[Enter]
- [ ] Special characters
- [ ] Case variations
- [ ] Large dataset (1000+ items)
- [ ] Offline mode
- [ ] Undo/redo
- [ ] Cross-page consistency

### Automated Testing
```typescript
describe('@ Token System', () => {
  test('parses multiple tokens', () => {});
  test('handles editing', () => {});
  test('validates input', () => {});
  test('syncs with Token Manager', () => {});
  test('handles special characters', () => {});
  test('maintains consistency', () => {});
});
```

## 11. SUCCESS METRICS

1. **Reliability**: 99.9% success rate for token operations
2. **Performance**: < 100ms menu display
3. **Consistency**: 100% sync between Manager and menu
4. **User Satisfaction**: < 1% error rate reported
5. **Scalability**: Handle 10,000+ tokens efficiently

## 12. FUTURE VISION

The @ system should evolve into a powerful metadata engine that:
- Connects tasks to people, values, and timelines
- Enables smart filtering and queries
- Integrates with external systems
- Provides insights and analytics
- Maintains Notion-like simplicity

---

**Remember**: Every edge case not handled is a future bug report. Build it right the first time.