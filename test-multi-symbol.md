# Multi-Symbol Token System Test

## Test Cases for Token Selection

### 1. Date tokens with #
- Type: `#today` → Select from menu → Should insert date and remove token
- Type: `#friday` → Select from menu → Should insert date and remove token
- Type: `#25/12` → Select from menu → Should insert date and remove token

### 2. Value tokens with $
- Type: `$100k` → Select from menu → Should insert value and remove token
- Type: `$1.5M` → Select from menu → Should insert value and remove token

### 3. Effort tokens with ~
- Type: `~2h` → Select from menu → Should insert effort and remove token
- Type: `~3d` → Select from menu → Should insert effort and remove token

### 4. Company tokens with &
- Type: `&ACME` → Select from menu → Should insert company and remove token
- Type: `&IBM` → Select from menu → Should insert company and remove token

### 5. Assignee tokens with @
- Type: `@John` → Select from menu → Should insert assignee and remove token
- Type: `@Sarah` → Select from menu → Should insert assignee and remove token

## Expected Behavior
1. When typing any symbol (#, $, ~, &, @), the menu should appear
2. The menu should show only suggestions relevant to that symbol
3. Selecting an item from the menu should:
   - Remove the token from the text
   - Add the metadata to the block
   - Show the appropriate chip
4. Pressing Escape should remove the incomplete token

## Fix Applied
Updated `handleTokenSelect` in SimpleBlock.tsx to:
- Track which symbol was detected
- Remove tokens with any symbol, not just @
- Place cursor at correct position after selection