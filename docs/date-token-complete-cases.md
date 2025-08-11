# Date Token System - Complete Case Documentation

## Overview
This document lists ALL date token cases that should be supported in the @ menu system. Each case should be tested and working correctly.

## 1. ENGLISH DATE TOKENS

### 1.1 Basic Terms
| Token | Expected Result | Status | Notes |
|-------|----------------|--------|-------|
| @today | Today's date | ✅ Implemented | |
| @tomorrow | Tomorrow's date | ✅ Implemented | |
| @yesterday | Yesterday's date | ✅ Implemented | |
| @td | Today (shortcut) | ✅ Implemented | |
| @tmr | Tomorrow (shortcut) | ✅ Implemented | |
| @yst | Yesterday (shortcut) | ✅ Implemented | |

### 1.2 Weekday Names
| Token | Expected Result | Status | Notes |
|-------|----------------|--------|-------|
| @monday | Next Monday | ✅ Implemented | |
| @tuesday | Next Tuesday | ✅ Implemented | |
| @wednesday | Next Wednesday | ✅ Implemented | |
| @thursday | Next Thursday | ✅ Implemented | |
| @friday | Next Friday | ✅ Implemented | |
| @saturday | Next Saturday | ✅ Implemented | |
| @sunday | Next Sunday | ✅ Implemented | |
| @mon | Next Monday (short) | ✅ Implemented | |
| @tue | Next Tuesday (short) | ✅ Implemented | |
| @wed | Next Wednesday (short) | ✅ Implemented | |
| @thu | Next Thursday (short) | ✅ Implemented | |
| @fri | Next Friday (short) | ✅ Implemented | |
| @sat | Next Saturday (short) | ✅ Implemented | |
| @sun | Next Sunday (short) | ✅ Implemented | |

### 1.3 Week-Related Terms
| Token | Expected Result | Status | Notes |
|-------|----------------|--------|-------|
| @this week | End of this week (Friday) | ✅ Implemented | |
| @next week | 7 days from now | ✅ Implemented | |
| @weekend | Next Saturday | ✅ Implemented | |
| @eow | End of week (Friday) | ✅ Implemented | |
| @eom | End of month | ✅ Implemented | |
| @eonw | End of next week | ✅ Implemented | |

### 1.4 Relative Dates (English)
| Token | Expected Result | Status | Notes |
|-------|----------------|--------|-------|
| @+1 | Tomorrow | ✅ Implemented | |
| @+3 | 3 days from now | ✅ Implemented | |
| @+7 | 7 days from now | ✅ Implemented | |
| @3d | 3 days from now | ✅ Implemented | |
| @7d | 7 days from now | ✅ Implemented | |
| @in 3 days | 3 days from now | ✅ Implemented | |
| @in 1 week | 7 days from now | ✅ Implemented | |
| @in 2 weeks | 14 days from now | ✅ Implemented | |
| @in 1 month | 1 month from now | ✅ Implemented | |

## 2. VIETNAMESE DATE TOKENS

### 2.1 Basic Terms (Vietnamese)
| Token | Expected Result | Status | Notes |
|-------|----------------|--------|-------|
| @hôm nay | Today | ✅ Implemented | With space |
| @hômnay | Today | ✅ Implemented | No space |
| @homnay | Today | ✅ Implemented | No tone |
| @hôm qua | Yesterday | ✅ Implemented | With space |
| @hômqua | Yesterday | ✅ Implemented | No space |
| @homqua | Yesterday | ✅ Implemented | No tone |
| @ngày mai | Tomorrow | ✅ Implemented | With space |
| @ngàymai | Tomorrow | ✅ Implemented | No space |
| @ngaymai | Tomorrow | ✅ Implemented | No tone |
| @mai | Tomorrow | ✅ Implemented | Short form |

### 2.2 Weekday Names (Vietnamese)
| Token | Expected Result | Status | Notes |
|-------|----------------|--------|-------|
| @thứ 2 | Next Monday | ✅ Implemented | With space |
| @thứ2 | Next Monday | ✅ Implemented | No space |
| @thu2 | Next Monday | ✅ Implemented | No tone |
| @t2 | Next Monday | ✅ Implemented | Shortest |
| @thứ 3 | Next Tuesday | ✅ Implemented | |
| @thứ3 | Next Tuesday | ✅ Implemented | |
| @t3 | Next Tuesday | ✅ Implemented | |
| @thứ 4 | Next Wednesday | ✅ Implemented | |
| @thứ4 | Next Wednesday | ✅ Implemented | |
| @t4 | Next Wednesday | ✅ Implemented | |
| @thứ 5 | Next Thursday | ✅ Implemented | |
| @thứ5 | Next Thursday | ✅ Implemented | |
| @t5 | Next Thursday | ✅ Implemented | |
| @thứ 6 | Next Friday | ✅ Implemented | |
| @thứ6 | Next Friday | ✅ Implemented | |
| @t6 | Next Friday | ✅ Implemented | |
| @thứ 7 | Next Saturday | ✅ Implemented | |
| @thứ7 | Next Saturday | ✅ Implemented | |
| @t7 | Next Saturday | ✅ Implemented | |
| @chủ nhật | Next Sunday | ✅ Implemented | With space |
| @chủnhật | Next Sunday | ✅ Implemented | No space |
| @chunhat | Next Sunday | ✅ Implemented | No tone |
| @cn | Next Sunday | ✅ Implemented | Shortest |

### 2.3 Week-Related Terms (Vietnamese)
| Token | Expected Result | Status | Notes |
|-------|----------------|--------|-------|
| @tuần này | This week | ✅ Implemented | With space |
| @tuầnnày | This week | ✅ Implemented | No space |
| @tuannay | This week | ✅ Implemented | No tone |
| @tuần tới | Next week | ✅ Implemented | With space |
| @tuầntới | Next week | ✅ Implemented | No space |
| @tuantoi | Next week | ✅ Implemented | No tone |
| @tuần sau | Next week | ✅ Implemented | Alternative |
| @tuầnsau | Next week | ✅ Implemented | |
| @tuansau | Next week | ✅ Implemented | |
| @cuối tuần | Weekend | ✅ Implemented | With space |
| @cuốituần | Weekend | ✅ Implemented | No space |
| @cuoituan | Weekend | ✅ Implemented | No tone |
| @đầu tuần | Monday | ✅ Implemented | With space |
| @đầutuần | Monday | ✅ Implemented | No space |
| @dautuan | Monday | ✅ Implemented | No tone |

### 2.4 Relative Dates (Vietnamese)
| Token | Expected Result | Status | Notes |
|-------|----------------|--------|-------|
| @sau 3 ngày | 3 days from now | ✅ Implemented | |
| @sau 1 tuần | 1 week from now | ✅ Implemented | |
| @sau 2 tuần | 2 weeks from now | ✅ Implemented | |
| @sau 1 tháng | 1 month from now | ✅ Implemented | |

## 3. DATE FORMATS

### 3.1 Standard Formats
| Token | Expected Result | Status | Notes |
|-------|----------------|--------|-------|
| @2024-12-31 | Dec 31, 2024 | ✅ Implemented | ISO format |
| @31/12/2024 | Dec 31, 2024 | ✅ Implemented | DD/MM/YYYY |
| @31/12/24 | Dec 31, 2024 | ✅ Implemented | DD/MM/YY |
| @31/12 | Dec 31, current year | ✅ Implemented | DD/MM |
| @31-12-2024 | Dec 31, 2024 | ✅ Implemented | DD-MM-YYYY |
| @31-12 | Dec 31, current year | ✅ Implemented | DD-MM |
| @31.12.2024 | Dec 31, 2024 | ✅ Implemented | DD.MM.YYYY |
| @31.12 | Dec 31, current year | ✅ Implemented | DD.MM |

## 4. MENU BEHAVIOR

### 4.1 Suggestion Priority
1. **Exact matches from configured dates** (priority: 1000)
2. **Common date shortcuts** (priority: 500)
3. **Historical dates used frequently** (priority: by usage count)
4. **Create new date option** (priority: -1)

### 4.2 Menu Display Requirements
| Scenario | Expected Behavior | Status |
|----------|-------------------|--------|
| Type @t | Show: today, tomorrow, tuesday, thursday, t2-t7 | ❌ TODO |
| Type @to | Show: today, tomorrow | ❌ TODO |
| Type @m | Show: monday, mai (tomorrow in Vietnamese) | ❌ TODO |
| Type @week | Show: weekend, this week, next week | ❌ TODO |
| Type @3 | Show: @+3 (3 days from now) | ❌ TODO |
| Type @25/12 | Recognize as date, offer to use | ❌ TODO |
| Type @hom | Show: hôm nay, hôm qua | ❌ TODO |
| Type @thu | Show: thursday, thứ 2-7 options | ❌ TODO |

### 4.3 Auto-complete Behavior
| User Types | Menu Shows | On Select | Result |
|------------|------------|-----------|--------|
| @tod | @today - Today | Press Enter | Date chip shows "today" |
| @tmr | @tomorrow - Tomorrow | Press Enter | Date chip shows "tmr" |
| @t2 | @t2 - Monday (Vietnamese) | Press Enter | Date chip shows next Monday |
| @mai | @mai - Tomorrow (Vietnamese) | Press Enter | Date chip shows "tmr" |
| @25/12 | @25/12 - Create as date | Press Enter | Date chip shows Dec 25 |

## 5. CHIP DISPLAY

### 5.1 Date Chip Format
| Original Token | Chip Display | Tooltip |
|----------------|--------------|---------|
| @today | "today" | Full date |
| @tomorrow | "tmr" | Full date |
| @monday | "Mon" | Full date |
| @t2 | "Mon" | Full date |
| @mai | "tmr" | Full date |
| @25/12/2024 | "Dec 25" | Full date |
| @+3 | "+3d" | Full date |
| @in 1 week | "+7d" | Full date |

## 6. TESTING CHECKLIST

### Basic Functionality
- [ ] All English basic terms work (today, tomorrow, yesterday)
- [ ] All English weekday names work (full and short)
- [ ] All Vietnamese basic terms work (with/without tones)
- [ ] All Vietnamese weekday names work (thứ 2-7, t2-7, cn)
- [ ] All date formats parse correctly
- [ ] Relative dates calculate correctly

### Menu Behavior
- [ ] Menu shows relevant suggestions based on partial input
- [ ] Priority ordering works correctly
- [ ] Vietnamese alternatives shown for English terms
- [ ] English alternatives shown for Vietnamese terms
- [ ] Create new option appears for unrecognized dates

### Edge Cases
- [ ] Mixed case handling (Today, TODAY, today)
- [ ] Extra spaces handled (@thứ  2, @hôm  nay)
- [ ] Invalid dates rejected (@32/13/2024)
- [ ] Past dates handled correctly
- [ ] Far future dates handled correctly

### Integration
- [ ] Dates save correctly to taskMetadata
- [ ] Date chips display correctly
- [ ] Date tokens removed from text content
- [ ] Multiple date tokens in same block (should keep only last)
- [ ] Copy/paste with date tokens

## 7. IMPLEMENTATION STATUS

### ✅ Completed
1. Core date parsing logic in `smartTokenParser.ts`
2. Basic date detection patterns
3. Vietnamese date support

### ❌ TODO
1. Improve menu suggestions for partial matches
2. Add all common date shortcuts to menu
3. Show bilingual alternatives in descriptions
4. Test all edge cases
5. Add date validation (reject invalid dates)
6. Improve chip display format

## 8. PRIORITY FIXES

### P0 - Critical
1. Menu doesn't show all relevant date suggestions
2. Some Vietnamese forms without tones may not work

### P1 - Important  
1. No validation for invalid dates
2. Missing helpful descriptions in menu
3. Priority ordering needs tuning

### P2 - Nice to have
1. Smart date suggestions based on context
2. Recurring date patterns (@every monday)
3. Date ranges (@from monday to friday)