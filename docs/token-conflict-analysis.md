# Token System Conflict Analysis

## Overview
This document analyzes potential conflicts between different token types (value, effort, due, assignee, company) to ensure the system correctly identifies and processes each type.

## 1. POTENTIAL CONFLICTS

### 1.1 Number-Based Conflicts

#### Conflict Case: Pure Numbers
| Input | Could be interpreted as | Current Logic | Issue? |
|-------|-------------------------|---------------|--------|
| @3 | Value: $3 | ✅ Detected as date (+3 days) | Good |
| @30 | Value: $30 | ✅ Detected as date (+30 days) | Good |
| @100 | Value: $100 | ⚠️ Detected as value | Conflict |
| @1000 | Value: $1000 | ✅ Detected as value | Good |
| @5 | Effort: 5h OR Date: +5 days | ⚠️ Ambiguous | **CONFLICT** |

**ISSUE**: Numbers 1-31 could be dates (days from now) or values/efforts

#### Conflict Case: Numbers with Units
| Input | Type A | Type B | Current Logic | Issue? |
|-------|--------|--------|---------------|--------|
| @3d | Effort: 3 days (24h) | Date: 3 days from now | ✅ Date wins | Good |
| @2h | Effort: 2 hours | - | ✅ Effort | Good |
| @1w | Effort: 1 week (40h) | - | ✅ Effort | Good |
| @30m | Effort: 30 minutes | - | ✅ Effort | Good |
| @1m | Effort: 1 minute OR 1 month | Date: 1 month | **CONFLICT** |

**ISSUE**: @1m could mean 1 minute (effort) or 1 month (effort/date)

### 1.2 Letter-Based Conflicts

#### Conflict Case: Single Letters
| Input | Could be | Current Logic | Issue? |
|-------|----------|---------------|--------|
| @d | Date shortcut? | Company? | ⚠️ Unclear | Potential |
| @m | Month? Monday? | - | ⚠️ Unclear | Potential |
| @t | Today? Tuesday? | - | ⚠️ Unclear | Potential |

#### Conflict Case: Short Codes
| Input | Type A | Type B | Current Logic | Issue? |
|-------|--------|--------|---------------|--------|
| @mon | Monday (date) | Monica (assignee) | ✅ Date wins if matches | Good |
| @sun | Sunday (date) | Sun (assignee) | ✅ Date wins if matches | Good |
| @may | May (month/assignee) | May (name) | **CONFLICT** |
| @june | June (month) | June (name) | **CONFLICT** |
| @mark | Mark (assignee) | - | ✅ Assignee | Good |

**ISSUE**: Month names could be people names

### 1.3 Vietnamese Conflicts

#### Conflict Case: Vietnamese Terms
| Input | Type A | Type B | Current Logic | Issue? |
|-------|--------|--------|---------------|--------|
| @mai | Tomorrow (date) | Mai (name) | ✅ Date wins | **CONFLICT** |
| @thu | Thursday | Thu (name) | ✅ Date wins | **CONFLICT** |
| @t2-t7 | Weekdays | T2-T7 (codes) | ✅ Date wins | Good |

**ISSUE**: Common Vietnamese names conflict with date terms

### 1.4 Company Code Conflicts

#### Conflict Case: Company vs Other
| Input | Type A | Type B | Current Logic | Issue? |
|-------|--------|--------|---------------|--------|
| @IBM | Company | - | ✅ Company | Good |
| @ACME | Company | - | ✅ Company | Good |
| @USA | Company? Country? | - | ⚠️ Unclear | Potential |
| @IT | Company? Department? | - | ⚠️ Unclear | Potential |
| @AI | Company? Technology? | - | ⚠️ Unclear | Potential |

### 1.5 Format Pattern Conflicts

#### Conflict Case: Slash/Dash/Dot Patterns
| Input | Type A | Type B | Current Logic | Issue? |
|-------|--------|--------|---------------|--------|
| @1/2 | Date: Feb 1 | Fraction: 0.5 | ✅ Date wins | Good |
| @12/25 | Date: Dec 25 | - | ✅ Date | Good |
| @3.14 | Date: Mar 14 | Value: 3.14 | **CONFLICT** |
| @2.5 | Date: Feb 5 | Value: 2.5 | **CONFLICT** |

**ISSUE**: Decimal numbers look like dates in DD.MM format

## 2. RESOLUTION STRATEGIES

### 2.1 Current Priority Order (inferType function)
1. Explicit prefixes (value:, effort:, due:, etc.)
2. Money patterns with K/M/B
3. Time patterns with h/d/w/m
4. Date patterns (most comprehensive)
5. Company patterns (uppercase)
6. Default: Assignee

### 2.2 Conflict Resolution Rules

#### Rule 1: Explicit Prefix Wins
```
@value:100 → Always value
@due:mai → Always date (tomorrow)
@assignee:may → Always assignee (not month)
```

#### Rule 2: Context Clues
```
@100k → Value (has K/M/B suffix)
@3h → Effort (has time unit)
@3d → Date (days from now takes precedence)
```

#### Rule 3: Pattern Specificity
```
@25/12 → Date (date pattern)
@3.14159 → Value (too many decimals for date)
@MON → Monday if in date shortcuts, else assignee
```

## 3. IDENTIFIED CONFLICTS TO FIX

### HIGH PRIORITY CONFLICTS

#### 1. Number Ambiguity (1-31)
**Problem**: @5 could be $5 or 5 days from now
**Solution**: 
- Numbers 1-31 alone → Treat as date (+N days)
- Numbers with $ or K/M/B → Value
- Numbers > 31 → Value
- Add hint in menu: "@5 → +5 days (use @value:5 for $5)"

#### 2. Vietnamese Name Conflicts
**Problem**: @mai could be Tomorrow or Mai (person)
**Solution**:
- Check configured assignees first
- If "Mai" is in assignees → Show both options
- Default to date if no assignee match
- Menu shows both: "Tomorrow (date)" and "Mai (person)"

#### 3. Decimal vs Date
**Problem**: @3.14 could be March 14 or value 3.14
**Solution**:
- Check decimal places: >2 decimals → Value
- Valid date (1-31).(1-12) → Show both options
- Let user choose from menu

#### 4. Month Names as Names
**Problem**: @may, @june, @april are valid names
**Solution**:
- Not currently parsing months, so defaults to assignee ✅
- This is actually working correctly

## 4. IMPLEMENTATION FIXES NEEDED

### Fix 1: Improve Number Detection
```typescript
function inferType(q: string): Suggestion['type'] | undefined {
  // Numbers 1-31 without suffix → Date (days from now)
  if (/^[1-9]$|^[12][0-9]$|^3[01]$/.test(q)) {
    return 'due'; // Treat as +N days
  }
  
  // Numbers with money indicators → Value
  if (/^\$?\d+(?:\.\d+)?[kmb]?$/i.test(q)) {
    return 'value';
  }
  
  // Continue with other patterns...
}
```

### Fix 2: Handle Ambiguous Cases in Menu
```typescript
// When detected as ambiguous, show multiple options
if (isAmbiguous(queryLower)) {
  // Show as date
  suggestions.push({
    type: 'due',
    label: `@${query} (as date)`,
    description: 'Interpret as date'
  });
  
  // Show as value
  suggestions.push({
    type: 'value', 
    label: `@${query} (as value)`,
    description: 'Interpret as money'
  });
  
  // Show as assignee if matches
  suggestions.push({
    type: 'assignee',
    label: `@${query} (as person)`,
    description: 'Interpret as assignee'
  });
}
```

### Fix 3: Add Validation
```typescript
// Validate that detected type makes sense
function validateDetection(value: string, type: string): boolean {
  switch(type) {
    case 'due':
      // Check if valid date
      const parsed = parseDueDate(value);
      return parsed !== null;
    
    case 'value':
      // Check if valid number
      const num = parseValue(value);
      return !isNaN(num) && num > 0;
    
    case 'effort':
      // Check if valid effort
      const effort = parseEffort(value);
      return !isNaN(effort) && effort > 0;
    
    default:
      return true;
  }
}
```

## 5. TEST CASES FOR CONFLICTS

### Must Test
1. @3 → Should show "+3 days" as primary option
2. @mai → Should show both "Tomorrow" and "Mai (person)" if Mai exists
3. @30 → Should show "+30 days" 
4. @100 → Should show "$100" as primary
5. @3.14 → Should show both "Mar 14" and "$3.14"
6. @1m → Should clarify: "1 month" vs "1 minute"
7. @mon → Should show "Monday" as primary
8. @may → Should be assignee (no month parsing)
9. @3d → Should be "+3 days" not "3 days effort"
10. @t2 → Should be "Monday (Vietnamese)"

## 6. RECOMMENDATIONS

### Immediate Actions
1. ✅ Fix number 1-31 detection (prefer date)
2. ✅ Show multiple options for ambiguous inputs
3. ✅ Add validation for detected types
4. ✅ Improve menu descriptions for clarity

### Future Improvements
1. Add user preference settings (prefer dates vs values)
2. Learn from user selections (ML approach)
3. Add explicit disambiguation syntax (@!value:3)
4. Context-aware detection based on surrounding text

## 7. CONCLUSION

Current conflicts:
- **Minor**: Most conflicts are handled well
- **Major**: Numbers 1-31 and Vietnamese names need attention
- **Resolution**: Menu should show multiple options when ambiguous
- **User Control**: Let user choose the interpretation