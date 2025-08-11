# Complete Token Detection Test Cases

## Symbol Rules (STRICT)
Each symbol should ONLY detect its designated type:
- **@** → People/Assignees ONLY
- **$** → Money/Values ONLY  
- **#** → Dates/Due dates ONLY
- **~** → Effort/Time ONLY
- **&** → Companies ONLY

## Test Cases

### 1. @ Symbol - Assignee ONLY

| Input | Expected Type | Expected Value | Common Error |
|-------|--------------|----------------|--------------|
| @John | assignee | "John" | ✓ |
| @Sarah | assignee | "Sarah" | ✓ |
| @123 | assignee | "123" | ❌ Often detected as date |
| @3 | assignee | "3" | ❌ Often detected as "3 days from now" |
| @100 | assignee | "100" | ❌ Often detected as value |
| @1000 | assignee | "1000" | ❌ Often detected as $1000 |
| @100k | assignee | "100k" | ❌ Often detected as $100k |
| @1m | assignee | "1m" | ❌ Often detected as 1 minute/month |
| @mai | assignee | "mai" | ❌ Often detected as tomorrow (Vietnamese) |
| @may | assignee | "may" | ❌ Often detected as May (month) |
| @monday | assignee | "monday" | ❌ Often detected as Monday (date) |
| @tomorrow | assignee | "tomorrow" | ❌ Often detected as tomorrow (date) |
| @25/12 | assignee | "25/12" | ❌ Often detected as Dec 25 |
| @2024-12-25 | assignee | "2024-12-25" | ❌ Often detected as date |
| @user123 | assignee | "user123" | ✓ |
| @john.doe | assignee | "john.doe" | ✓ |
| @3h | assignee | "3h" | ❌ Often detected as 3 hours |
| @2d | assignee | "2d" | ❌ Often detected as 2 days |

### 2. $ Symbol - Value ONLY

| Input | Expected Type | Expected Value | Notes |
|-------|--------------|----------------|-------|
| $100 | value | 100 | ✓ |
| $100k | value | 100000 | ✓ |
| $100K | value | 100000 | ✓ |
| $1.5M | value | 1500000 | ✓ |
| $1B | value | 1000000000 | ✓ |
| $3 | value | 3 | ✓ |
| $0.5 | value | 0.5 | ✓ |
| $mai | INVALID | - | Should not parse |
| $tomorrow | INVALID | - | Should not parse |
| $john | INVALID | - | Should not parse |

### 3. # Symbol - Date ONLY

| Input | Expected Type | Expected Value | Notes |
|-------|--------------|----------------|-------|
| #today | due | Today's date | ✓ |
| #tomorrow | due | Tomorrow's date | ✓ |
| #yesterday | due | Yesterday's date | ✓ |
| #3 | due | 3 days from now | ✓ |
| #123 | due | 123 days from now | Should work |
| #+5 | due | 5 days from now | ✓ |
| #monday | due | Next Monday | ✓ |
| #friday | due | Next Friday | ✓ |
| #25/12 | due | Dec 25 | ✓ |
| #12/25 | due | Dec 25 | ✓ |
| #2024-12-25 | due | Dec 25, 2024 | ✓ |
| #mai | due | Tomorrow (Vietnamese) | ✓ |
| #next week | due | Next week | ✓ |
| #eow | due | End of week | ✓ |
| #eom | due | End of month | ✓ |
| #john | due | - | Should attempt to parse as date |
| #100k | due | - | Should attempt to parse as date |

### 4. ~ Symbol - Effort ONLY

| Input | Expected Type | Expected Value (hours) | Notes |
|-------|--------------|------------------------|-------|
| ~15m | effort | 0.25 | 15 minutes |
| ~30m | effort | 0.5 | 30 minutes |
| ~1h | effort | 1 | 1 hour |
| ~2h | effort | 2 | 2 hours |
| ~1.5h | effort | 1.5 | 1.5 hours |
| ~1d | effort | 8 | 1 day (8 hours) |
| ~3d | effort | 24 | 3 days |
| ~1w | effort | 40 | 1 week |
| ~2w | effort | 80 | 2 weeks |
| ~john | INVALID | - | Should not parse |
| ~tomorrow | INVALID | - | Should not parse |
| ~100k | INVALID | - | Should not parse |

### 5. & Symbol - Company ONLY

| Input | Expected Type | Expected Value | Notes |
|-------|--------------|----------------|-------|
| &AIC | company | "AIC" | ✓ if in company list |
| &WN | company | "WN" | ✓ if in company list |
| &BXV | company | "BXV" | ✓ if in company list |
| &EA | company | "EA" | ✓ if in company list |
| &PERSONAL | company | "PERSONAL" | ✓ if in company list |
| &IBM | INVALID | - | Not in company list |
| &ACME | INVALID | - | Not in company list |
| &123 | INVALID | - | Should not parse |
| &john | INVALID | - | Should not parse |

## Complex Test Sentences

### Test 1: Number Ambiguity
**Input:** "Meeting with @123 about $100k project #3"
**Expected:**
- @123 → assignee: "123"
- $100k → value: 100000
- #3 → due: 3 days from now

### Test 2: Vietnamese Names
**Input:** "@mai will review the proposal #mai for ~2h"
**Expected:**
- @mai → assignee: "mai" (person named Mai)
- #mai → due: tomorrow (Vietnamese for tomorrow)
- ~2h → effort: 2 hours

### Test 3: All Symbols
**Input:** "Task for @john &AIC $500k ~4h #friday"
**Expected:**
- @john → assignee: "john"
- &AIC → company: "AIC"
- $500k → value: 500000
- ~4h → effort: 4 hours
- #friday → due: next Friday

### Test 4: Numeric Assignee
**Input:** "Assign to @3 worth $3 due in #3 days"
**Expected:**
- @3 → assignee: "3" (NOT date!)
- $3 → value: 3
- #3 → due: 3 days from now

### Test 5: Mixed Content
**Input:** "@100k needs to pay $100k by #tomorrow"
**Expected:**
- @100k → assignee: "100k" (NOT value!)
- $100k → value: 100000
- #tomorrow → due: tomorrow

### Test 6: Date-like Assignee
**Input:** "@2024-12-25 scheduled for #2024-12-25"
**Expected:**
- @2024-12-25 → assignee: "2024-12-25" (NOT date!)
- #2024-12-25 → due: Dec 25, 2024

## Implementation Requirements

1. **No Cross-Detection:** Each symbol must ONLY detect its own type
2. **No Fallback:** If a symbol's content doesn't match its type, return null (don't try other types)
3. **Strict Parsing:** 
   - @ → Always assignee, even if content looks like date/value
   - $ → Only if valid number format
   - # → Always attempt date parsing
   - ~ → Only if valid time format (m/h/d/w)
   - & → Only if in company list

## Edge Cases to Handle

1. **@123** must be assignee "123", not a date
2. **@3** must be assignee "3", not "3 days from now"
3. **@mai** must be assignee "mai", not "tomorrow"
4. **@100k** must be assignee "100k", not value
5. **@tomorrow** must be assignee "tomorrow", not a date
6. **#123** should be "123 days from now"
7. **#mai** should be "tomorrow" in Vietnamese
8. **~3m** should be 3 minutes (0.05 hours)
9. **~3d** should be 3 days (24 hours), not a date

## Testing Priority

1. ✅ Ensure @ never triggers date detection
2. ✅ Ensure @ never triggers value detection  
3. ✅ Ensure @ accepts any string as assignee
4. ✅ Ensure $ only accepts valid number formats
5. ✅ Ensure # always attempts date parsing
6. ✅ Ensure ~ only accepts time units (m/h/d/w)
7. ✅ Ensure & only accepts company codes from list