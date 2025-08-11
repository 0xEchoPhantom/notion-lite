# Token Manager & @ Menu Logic - Complete Case Coverage

## Overview
This document outlines all possible interaction cases between the Token Manager (settings) and the @ menu (inline input).

## Case Categories

### 1. Value Sources
- **Configured Values**: Explicitly added in Token Manager
- **Historical Values**: Previously used in tasks but not in Token Manager
- **New Values**: Being created for the first time

### 2. User Flows

#### A. Creating New Values via @ Menu
| User Action | Current State | Expected Behavior | Auto-save to Manager? |
|------------|---------------|-------------------|---------------------|
| Types @John | John not in Manager, not in history | Show "Create new: @John" | YES - on selection |
| Types @John | John in Manager already | Show existing John (no create option) | NO - already exists |
| Types @John | John in history but not Manager | Show historical John + "Add to Manager" option | YES - if user selects "Add to Manager" |
| Types @john | John in Manager (different case) | Show John, handle case-insensitively | NO - already exists |
| Types @Jo | John, Joey in Manager | Show both as partial matches | NO - showing existing |

#### B. Managing Values in Token Manager
| User Action | Expected @ Menu Behavior |
|------------|-------------------------|
| Adds "Sarah" to Manager | @Sarah appears immediately in suggestions |
| Removes "Sarah" from Manager | @Sarah still shows if in history, lower priority |
| Edits "John" to "Johnny" | Both @John (historical) and @Johnny (configured) may show |
| Adds duplicate (case different) | Normalize and prevent duplicates |

#### C. Historical Value Handling
| Scenario | Behavior |
|----------|----------|
| Value used 10+ times but not in Manager | Show with high priority, offer "Add to Manager" |
| Value in both Manager and history | Show only Manager version (higher priority) |
| Value removed from Manager but in history | Show as historical with lower priority |

### 3. Edge Cases

#### Data Normalization
- **Assignees**: Case-sensitive ("John" ≠ "john" ≠ "JOHN")
- **Companies**: Always uppercase ("acme" → "ACME")
- **Values**: Numeric normalization (1000 = 1k = 1K)
- **Efforts**: Time normalization (0.5h = 30m)

#### Duplicate Prevention
```
Manager has: ["John", "Sarah"]
User tries to add: "john", "JOHN", "John "
Result: Rejected as duplicate (after normalization)
```

#### Priority Order in @ Menu
1. **Exact matches from Manager** (count: 1000)
2. **Partial matches from Manager** (count: 900-999)
3. **Exact matches from history** (count: actual usage)
4. **Partial matches from history** (count: actual usage)
5. **"Create new" option** (count: -1)

### 4. Visual Indicators

| Source | Icon | Badge/Label | Color |
|--------|------|-------------|-------|
| Token Manager | 📌 | "Configured" | Blue |
| Historical (high usage) | ⭐ | "Frequently used" | Gold |
| Historical (low usage) | 📊 | "Used X times" | Gray |
| Create new | ➕ | "Create new" | Green |
| Add to Manager | 📍 | "Add to Manager" | Purple |

### 5. Implementation Rules

#### Rule 1: Case Handling
```typescript
// Assignees: Preserve case but match case-insensitively
"John" matches: "john", "JOHN", "John"
Stored as: "John" (as entered in Manager)

// Companies: Always uppercase
"Acme" → "ACME"
"acme" → "ACME"

// Values & Efforts: Normalized to numbers
"1k" → 1000
"1K" → 1000
"30m" → 0.5 (hours)
```

#### Rule 2: Deduplication
```typescript
// Check for duplicates before adding
function isDuplicate(newValue: string, existingValues: string[], type: TokenType) {
  const normalized = normalize(newValue, type);
  return existingValues.some(v => normalize(v, type) === normalized);
}
```

#### Rule 3: Auto-promotion
```typescript
// Automatically suggest adding to Manager if used frequently
if (historicalUsageCount >= 5 && !inManager) {
  showPromotionPrompt();
}
```

#### Rule 4: Sync Timing
- **Immediate sync**: Manager → @ menu (on save)
- **Immediate sync**: @ menu → Manager (on "Create new" selection)
- **Optional sync**: History → Manager (on user confirmation)

### 6. User Experience Principles

1. **No Surprises**: User should understand where values come from
2. **No Duplicates**: Prevent confusing duplicate entries
3. **Smart Defaults**: Most likely value first
4. **Easy Management**: Quick add/remove from Manager
5. **Clear Feedback**: Show what will happen before it happens

### 7. Complete Case Matrix

| User Types | In Manager? | In History? | Show in @ Menu | Action on Select |
|------------|------------|-------------|----------------|------------------|
| @John | Yes | Yes/No | ✅ John (Configured) | Use existing |
| @John | No | Yes | ✅ John (Used 5×) + "Add to Manager" | Use + option to add |
| @John | No | No | ✅ "Create new: @John" | Create + auto-add |
| @john | Yes (as "John") | - | ✅ John (Configured) | Use existing (normalized) |
| @Jo | "John", "Joey" exist | - | ✅ Both as matches | Use selected |
| @123 | No | No | ✅ "Create new: @123" | Detect type, create |

### 8. Database Schema Considerations

```typescript
// Token Settings (Manager)
{
  assignees: string[],      // ["John", "Sarah"]
  companies: string[],      // ["ACME", "IBM"]
  commonValues: number[],   // [1000, 5000, 10000]
  commonEfforts: number[],  // [0.5, 1, 2, 4, 8]
}

// Task Metadata (Historical)
{
  assignee?: string,        // "John"
  company?: string,         // "ACME"  
  value?: number,          // 5000
  effort?: number,         // 2
  dueDate?: Date,         // Date object
}
```

### 9. Migration & Cleanup

#### Periodic Cleanup Tasks
1. Remove unused Manager values (0 usage in 30 days)
2. Suggest frequently used historical values for Manager
3. Normalize existing data (uppercase companies, etc.)
4. Merge duplicate entries

#### User-Triggered Actions
- "Import historical values" - Add all historical to Manager
- "Clean unused values" - Remove 0-usage Manager entries
- "Reset to defaults" - Restore default values

### 10. Testing Scenarios

1. **New User**: No Manager config, no history → Should see defaults + create options
2. **Power User**: Extensive Manager config → Should see configured values first
3. **Migrated User**: Has history but no Manager → Should see history + promotion prompts
4. **Case Confusion**: Mixed case in history → Should normalize and deduplicate
5. **Type Detection**: User types ambiguous value → Should infer type correctly