# Multi-Symbol Token System Test Cases

## ✅ System is now implemented!

### New Symbol Mapping
- **@** → People/Assignees (e.g., @John, @Sarah)
- **$** → Money/Values (e.g., $100k, $1.5M)
- **#** → Dates/Due dates (e.g., #today, #friday, #25/12)
- **~** → Effort/Time (e.g., ~2h, ~3d, ~1w)
- **&** → Companies/Organizations (e.g., &ACME, &IBM)

## Test Examples

### 1. Clear Task with No Conflicts
```
Old: Meeting @John @ACME @10k @2h @friday
New: Meeting @John &ACME $10k ~2h #friday
```
**Result**: Crystal clear what each token means!

### 2. Vietnamese Example
```
Old: Họp @Mai @mai @100k @2h (Mai person or mai tomorrow??)
New: Họp @Mai #mai $100k ~2h
```
**Result**: Meeting with Mai (person) tomorrow (date) about $100k for 2 hours

### 3. Number Conflicts Resolved
```
Old: Task @3 @30 @100
Ambiguous: Is @3 = $3 or 3 days? Is @30 = $30 or 30 days?

New: Task #3 $100 ~30m
Clear: Task in 3 days, worth $100, takes 30 minutes
```

### 4. All Symbols in One Task
```
Review contract @John @Sarah &IBM $500k ~4h #next week
```
**Meaning**: Review contract with John and Sarah from IBM, $500k deal, 4 hours effort, due next week

## How It Works

### When typing tokens:
1. Type `@` → See only people suggestions
2. Type `$` → See only value/money suggestions  
3. Type `#` → See only date suggestions
4. Type `~` → See only effort/time suggestions
5. Type `&` → See only company suggestions

### Visual Feedback:
- @ tokens → 👤 Blue chips (people)
- $ tokens → 💵 Green chips (money)
- # tokens → 📅 Orange chips (dates)
- ~ tokens → ⏱️ Purple chips (time)
- & tokens → 🏢 Gray chips (companies)

## Benefits Achieved

✅ **No more ambiguity** - Each symbol has ONE clear meaning
✅ **Faster parsing** - No complex detection logic needed
✅ **Better UX** - Targeted suggestions per symbol
✅ **Vietnamese conflicts solved** - @mai (person) vs #mai (tomorrow)
✅ **Natural symbols** - $ for money is universal
✅ **Backward compatible** - @ still works for legacy data

## Migration Path

### Phase 1 (Current)
- Multi-symbol system is active
- @ still works for all types (backward compatibility)
- New tokens use appropriate symbols

### Phase 2 (Future)
- Deprecate @ for non-people
- Auto-migration tool for old content
- Settings to enforce new system

## Quick Reference

| What you want | Old way | New way |
|--------------|---------|---------|
| Assign to John | @John | @John |
| Set value $100k | @100k | $100k |
| Due tomorrow | @tomorrow | #tomorrow |
| 2 hours effort | @2h | ~2h |
| ACME company | @ACME | &ACME |
| 3 days from now | @3 or @+3 | #3 or #+3 |
| Mai (person) | @mai | @mai |
| Tomorrow (Vietnamese) | @mai | #mai |

## Status: READY FOR TESTING! 🎉