# Multi-Symbol Token System Proposal

## Current Problem
Using @ for all token types causes conflicts:
- @3 → Is it $3 or 3 days from now?
- @mai → Is it Tomorrow or Mai (person)?
- @may → Is it May (month) or May (person)?
- @1m → Is it 1 minute or 1 month?

## Proposed Solution: Different Symbols for Different Types

### Symbol Mapping

| Symbol | Type | Examples | Rationale |
|--------|------|----------|-----------|
| **@** | Assignee/Person | @John, @Sarah, @Mai | Standard for mentioning people |
| **$** | Value/Money | $100, $10k, $1.5M | Natural money symbol |
| **#** | Date/Due | #today, #tmr, #25/12, #mai | Hash for scheduling |
| **%** | Effort/Time | %2h, %3d, %1w | Percentage of time |
| **&** | Company/Org | &ACME, &IBM, &AIC | Ampersand for entities |

### Alternative Symbol Schemes

#### Option A: Intuitive Symbols
- @ → People (standard)
- $ → Money (natural)
- # → Dates (like hashtags/events)
- ~ → Effort (wavy like time flowing)
- & → Companies (business entities)

#### Option B: Keyboard-Friendly
- @ → People
- $ → Money  
- ! → Dates (urgent/important)
- % → Effort
- ^ → Companies (corporate/up)

#### Option C: Minimal Conflicts
- @ → People
- $ → Money
- / → Dates (like date separators)
- * → Effort (multiply time)
- + → Companies (adding business)

## Benefits of Multi-Symbol Approach

### 1. Zero Ambiguity
```
Before: @3 → Could be money or date
After:  $3 → Clearly money
        #3 → Clearly 3 days from now
```

### 2. Clearer Intent
```
Before: Meeting @John @10k @2h @tomorrow
After:  Meeting @John $10k %2h #tomorrow
        (Clear: person, value, effort, date)
```

### 3. Better Parsing
```typescript
// Simple and fast parsing
if (token.startsWith('@')) return { type: 'assignee', ... }
if (token.startsWith('$')) return { type: 'value', ... }
if (token.startsWith('#')) return { type: 'due', ... }
if (token.startsWith('%')) return { type: 'effort', ... }
if (token.startsWith('&')) return { type: 'company', ... }
```

### 4. No Vietnamese Name Conflicts
```
Before: @mai → Tomorrow or Mai?
After:  @mai → Person named Mai
        #mai → Tomorrow in Vietnamese
```

## Implementation Examples

### Task Examples

#### Example 1: Project Planning
```
Before: Review proposal @John @ACME @10k @3h @friday
After:  Review proposal @John &ACME $10k %3h #friday
```

#### Example 2: Vietnamese Mixed
```
Before: Họp @Mai @mai @2h @100k
After:  Họp @Mai #mai %2h $100k
        (Meeting with Mai tomorrow for 2 hours, $100k project)
```

#### Example 3: Quick Task
```
Before: Call client @3 @15m
After:  Call client #3 %15m
        (Call client in 3 days, 15 minutes duration)
```

## User Experience

### Menu Behavior
When user types:
- `@` → Show people suggestions only
- `$` → Show value suggestions only
- `#` → Show date suggestions only
- `%` → Show effort suggestions only
- `&` → Show company suggestions only

### Visual Chips
Each type gets distinct visual treatment:
- @ → 👤 Blue chip (people)
- $ → 💵 Green chip (money)
- # → 📅 Orange chip (dates)
- % → ⏱️ Purple chip (time)
- & → 🏢 Gray chip (companies)

## Migration Strategy

### Phase 1: Support Both
- Keep @ working for all types (backward compatibility)
- Add new symbols as preferred method
- Show migration hints in menu

### Phase 2: Encourage New System
- Menu primarily shows new symbols
- Documentation uses new symbols
- Add setting to disable old @ system

### Phase 3: Deprecate @ for Non-People
- @ only works for people
- Other types require their symbols
- Auto-migrate old content

## Edge Cases Resolved

### All Previous Conflicts Solved
| Old Conflict | New Solution |
|-------------|--------------|
| @3 ambiguous | $3 vs #3 clear |
| @mai ambiguous | @mai vs #mai clear |
| @1m ambiguous | %1m (minute) vs #1m (month from now) |
| @mon ambiguous | @Monica vs #mon clear |
| @may ambiguous | @May vs #may clear |

### New Patterns Possible
```
$100/h → Value per hour
%8h/d → 8 hours per day effort
#every-monday → Recurring dates (future)
&ACME/US → Company with location
@team:engineering → Team mentions (future)
```

## Pros and Cons

### Pros
✅ Zero ambiguity
✅ Faster parsing
✅ Clearer intent
✅ Better UX (targeted menus)
✅ Extensible for future types
✅ Natural symbols ($ for money)

### Cons
❌ Learning curve for users
❌ More symbols to remember
❌ Migration effort needed
❌ Some symbols might conflict with markdown

## Recommendation

**Adopt Option A: Intuitive Symbols**
- @ People (standard)
- $ Money (natural)
- # Dates (events/scheduling)
- ~ Effort (flowing time)
- & Companies (entities)

This provides the best balance of:
1. Intuitive meaning
2. Low conflict with existing syntax
3. Easy to type
4. Clear visual distinction

## Implementation Priority

1. **Week 1**: Add $ for values (most natural)
2. **Week 2**: Add # for dates (biggest conflict resolver)
3. **Week 3**: Add ~ for effort
4. **Week 4**: Add & for companies
5. **Month 2**: Migration tools and deprecation plan

## Testing Plan

### User Testing Questions
1. Which symbols feel most natural?
2. Any conflicts with your workflow?
3. Easier or harder than single @?
4. Preference for symbols?

### A/B Testing
- Group A: Single @ (current)
- Group B: Multi-symbol
- Measure: Task completion time, error rate, user satisfaction

## Conclusion

Moving from single @ to multiple symbols will:
- Eliminate ALL type conflicts
- Improve parsing speed and accuracy
- Make user intent clearer
- Enable better features in future

The small learning curve is worth the massive improvement in clarity and functionality.