# Notion Link Interactions Documentation

## Core Behavior
- Notion URLs should be removed from the visible text input
- URLs are stored in the background (in the actual content)
- URLs appear as clickable attachment chips below the text
- Each attachment can be individually deleted with an X button

## All Possible User Interactions

### 1. Pasting Scenarios
- [ ] **Paste URL alone** - URL disappears, attachment appears
- [ ] **Paste URL after text** - "Hello [paste URL]" → "Hello" + attachment
- [ ] **Paste URL between text** - "Hello [paste URL] world" → "Hello world" + attachment
- [ ] **Paste multiple URLs at once** - All URLs become attachments
- [ ] **Paste URL then continue typing** - Can type normally after paste
- [ ] **Paste URL then press space** - Space should work normally
- [ ] **Paste URL then press enter** - New line should work
- [ ] **Paste mixed content** - "Check this: URL and this: URL2" → "Check this: and this:" + 2 attachments

### 2. Typing Scenarios
- [ ] **Type before existing attachment** - Should work normally
- [ ] **Type after creating attachment** - Should work normally
- [ ] **Add text around attachments** - Text editing shouldn't affect attachments
- [ ] **Backspace near attachment trigger** - Shouldn't delete attachment unless intentional
- [ ] **Type another URL manually** - Should become attachment when complete

### 3. Editing Scenarios
- [ ] **Select all and delete** - Should clear text but preserve attachments
- [ ] **Select all and type** - Should replace text but preserve attachments
- [ ] **Cut and paste text** - Attachments should remain
- [ ] **Undo after paste** - Should undo the paste but handle attachments correctly
- [ ] **Redo after undo** - Should restore attachments
- [ ] **Multiple undo/redo** - Attachments should persist through history

### 4. Attachment Management
- [ ] **Click attachment** - Opens Notion page in new tab
- [ ] **Hover attachment** - Shows delete button
- [ ] **Delete attachment** - Removes only that specific attachment
- [ ] **Delete all attachments** - Each can be deleted individually
- [ ] **Delete text with attachments** - Attachments remain unless explicitly deleted

### 5. Focus/Blur Scenarios
- [ ] **Click into block with attachments** - Display should be clean (no URLs)
- [ ] **Click out of block** - Attachments should persist
- [ ] **Tab through blocks** - Attachments remain
- [ ] **Navigate with arrows** - Attachments unaffected

### 6. Block Operations
- [ ] **Convert block type** - Attachments should persist
- [ ] **Delete empty block with attachments** - Should require explicit action
- [ ] **Duplicate block** - Attachments should duplicate
- [ ] **Move block** - Attachments move with block
- [ ] **Indent/outdent** - Attachments remain

### 7. Special Characters & Formatting
- [ ] **Paste URL with spaces around** - " URL " → "" + attachment
- [ ] **Paste URL with punctuation** - "Check: URL!" → "Check: !" + attachment
- [ ] **URL in parentheses** - "(URL)" → "()" + attachment
- [ ] **URL with line breaks** - "Line1\nURL\nLine2" → "Line1\nLine2" + attachment

### 8. Edge Cases
- [ ] **Paste same URL twice** - Should handle duplicates appropriately
- [ ] **Paste invalid Notion URL** - Should remain as text
- [ ] **Paste Notion URL with query params** - Should work as attachment
- [ ] **Very long text with URL** - Should handle gracefully
- [ ] **URL at start of block** - "URL then text" → "then text" + attachment
- [ ] **URL at end of block** - "text then URL" → "text then" + attachment
- [ ] **Rapid paste/delete cycles** - Should remain stable

### 9. Token Interactions (@, #, etc.)
- [ ] **Type @ before URL** - Token suggest shouldn't interfere
- [ ] **Type @ after URL** - Should work normally with attachment present
- [ ] **URL contains @** - Should still be recognized as URL
- [ ] **Complete token then paste URL** - Both should work

### 10. Performance Considerations
- [ ] **Many attachments (10+)** - Should render efficiently
- [ ] **Long URLs** - Should display nicely truncated
- [ ] **Rapid typing after paste** - No lag or loss of keystrokes
- [ ] **Quick paste multiple URLs** - All should be processed

## Current Issues to Fix

### Critical Bugs
1. **Cannot type space after pasting URL** - Space key doesn't work after URL paste
2. **Attachment disappears on continued typing** - Fixed but needs verification

### Known Limitations
1. URLs are stored at the end of content (separated by newlines)
2. Display/actual content sync needs careful management
3. Cursor position after URL removal needs attention

## Implementation Strategy

### Data Flow
1. **Input Event** → Detect Notion URLs
2. **Process URLs** → Remove from display, keep in storage
3. **Update Display** → Show clean text in input
4. **Update Storage** → Save full content with URLs
5. **Render Attachments** → Show URL chips below text

### Key Functions Needed
- `extractAndRemoveUrls(text)` - Remove URLs from display
- `preserveUrls(displayText, existingUrls)` - Maintain URLs in storage
- `syncDisplayWithStorage()` - Keep display/storage in sync
- `handleUrlPaste(event)` - Special handling for URL pastes
- `updateCursorPosition()` - Fix cursor after URL removal

## Testing Checklist
- [ ] Manual test each scenario above
- [ ] Test with multiple users
- [ ] Test with slow network
- [ ] Test with different Notion URL formats
- [ ] Test copy/paste between blocks