# Smart View Documentation

## Overview
Smart View is an intelligent task management system that provides multiple perspectives on your todos, automatically calculating ROI (Return on Investment), tracking status consistency, and highlighting priority tasks.

## Core Features

### 1. Multiple View Modes

#### Board View
- Visual kanban-style columns organized by status
- Statuses: ⚡ Now, ⏭️ Next, ⏳ Waiting, 💭 Someday, ✅ Done
- Shows task count per column
- Visual indicators for overdue and upcoming tasks

#### Table View
- Sortable list of all tasks sorted by ROI
- Columns: Task, Status, ROI, Value, Effort, Due Date
- Clean tabular format for quick scanning
- Color-coded status badges

#### Priority View
- Split view showing:
  - 🔥 High Priority Tasks (top 5 by ROI)
  - 📊 Need More Info (tasks missing value/effort data)
- Focuses attention on what matters most

### 2. ROI Calculation

**Formula**: `ROI = Value / Effort`

- Automatically calculated for all tasks
- Displayed as `$/hour` rate
- Tasks with missing data show as "Incomplete"
- Higher ROI tasks are prioritized in views

### 3. Status Consistency Monitoring

**Visual Indicator**: 
- 🟢 Green (90-100%): Excellent consistency
- 🟡 Yellow (70-89%): Some misalignment
- 🔴 Red (<70%): Significant misalignment

**How it works**:
- Checks if task status matches its GTD page location
- Highlights inconsistent tasks with yellow border
- Shows expected vs actual status
- Helps maintain GTD methodology integrity

## Token System

Smart View uses special tokens to capture task metadata:

### Value Token: `$`
- Format: `$<number>[K|M|B]`
- Examples: `$500`, `$5K`, `$2.5M`
- Represents monetary value or importance

### Effort Token: `~`  
- Format: `~<number>[m|h|d|w]`
- Examples: `~30m`, `~2h`, `~3d`, `~1w`
- Units: m=minutes, h=hours, d=days (8h), w=weeks (40h)

### Due Date Token: `#`
- Format: `#<date>`
- Examples: `#today`, `#tmr`, `#fri`, `#25/12`, `#2024-12-25`
- Supports:
  - Relative: today, tomorrow, +3d
  - Weekdays: mon, tue, wed, etc.
  - Dates: DD/MM, DD/MM/YYYY, ISO format
  - Vietnamese: hôm nay, ngày mai, thứ 2, etc.

### Company Token: `&`
- Format: `&<company>`
- Examples: `&HOME`, `&WORK`, `&GYM`
- Predefined companies in system

### Assignee Token: `@`
- Format: `@<person>`
- Examples: `@john`, `@sarah`
- For delegation tracking

## Use Cases

### 1. Daily Planning
**Scenario**: Start your day by checking Priority View
- See top 5 highest ROI tasks
- Quick scan for urgent deadlines
- Identify tasks needing more info

**Example Task**: 
```
Fix critical bug for client $5K ~2h #today &WORK
```
- ROI: $2,500/hour
- Status: Should be "now" if on next-actions page

### 2. Weekly Review
**Scenario**: Use Table View for comprehensive overview
- Sort by ROI to find high-value opportunities
- Check status consistency indicator
- Move tasks to appropriate GTD pages

**Benefits**:
- Ensures nothing falls through cracks
- Maintains GTD system integrity
- Optimizes time allocation

### 3. Project Prioritization
**Scenario**: Multiple projects competing for time
- Add value and effort estimates to all projects
- Board View shows distribution across statuses
- ROI calculation reveals best time investments

**Example Projects**:
```
Project A: Build new feature $10K ~20h → ROI: $500/h
Project B: Client presentation $2K ~2h → ROI: $1,000/h
Project C: Internal tool $500 ~10h → ROI: $50/h
```
→ Project B should be prioritized

### 4. Delegation Management
**Scenario**: Track delegated tasks in Waiting status
- Use `@person` tokens to track assignees
- Waiting column shows all delegated items
- Due dates ensure follow-up timing

**Example**:
```
Review proposal draft @sarah #fri ~30m &WORK
```
- Status: waiting
- Clear accountability and deadline

### 5. Missing Data Detection
**Scenario**: Incomplete task information
- Priority View highlights tasks without value/effort
- Prompts you to add missing data
- Improves decision-making quality

**Before**: `Update website homepage`
**After**: `Update website homepage $3K ~8h #eow &WORK`

### 6. Status Alignment
**Scenario**: Tasks in wrong GTD locations
- Yellow border highlights misaligned tasks
- Shows current vs expected status
- Maintains GTD methodology

**Example**:
- Task with status "next" on "waiting-for" page
- System shows: `'next' → should be 'waiting'`
- Either update status or move to correct page

## GTD Page Mappings

| Page | Expected Status | Purpose |
|------|----------------|---------|
| inbox | someday | Quick capture, needs processing |
| next-actions | next/now | Active tasks ready to work |
| waiting-for | waiting | Delegated or blocked tasks |
| someday-maybe | someday | Future considerations |

## Best Practices

1. **Add metadata immediately**: Include value and effort when creating tasks
2. **Review consistency weekly**: Check the status indicator regularly
3. **Focus on ROI**: Let data guide your priorities
4. **Update statuses**: Keep task status aligned with page location
5. **Process inbox regularly**: Move tasks from inbox to appropriate pages

## Tips & Tricks

- **Quick ROI**: High value + low effort = prioritize immediately
- **Batch similar tasks**: Group low-ROI tasks together
- **Time-box unknowns**: Add effort estimates even if uncertain
- **Status shortcuts**: 
  - Now = currently working
  - Next = ready to start
  - Waiting = blocked/delegated
  - Someday = future/maybe

## Common Patterns

### High-Value Quick Wins
```
Reply to CEO email $10K ~15m #today
```
ROI: $40,000/hour → Do immediately

### Long-term Investments
```
Learn new framework $20K ~40h #eom
```
ROI: $500/hour → Schedule dedicated time

### Maintenance Tasks
```
Weekly report $100 ~1h #fri
```
ROI: $100/hour → Batch with similar tasks

### Uncertain Value
```
Explore partnership opportunity $??? ~4h
```
Missing value → Add estimate or mark as research