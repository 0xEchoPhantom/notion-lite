# Quick Capture Migration Guide

This guide helps you migrate from capturing directly to Notion to using Notion Lite's Quick Capture API.

## Overview

Instead of sending quick captures directly to Notion, you can now send them to Notion Lite, which gives you:
- Faster local capture
- Token processing (@assignee, $value, etc.)
- Integration with your GTD workflow
- No Notion API rate limits

## Setup Steps

### 1. Get Your Credentials

1. Open Notion Lite in your browser
2. Go to **Settings** → **Quick Capture**
3. Copy your:
   - **User ID**: Your unique identifier
   - **API Key**: Your authentication token

### 2. Update Your Python App

Replace your existing Notion API calls with this code:

```python
import requests

# Configuration - Update these with your values
NOTION_LITE_URL = "http://localhost:3002"  # Or your Vercel URL
API_KEY = "your-api-key-here"  # From settings page
USER_ID = "your-user-id-here"  # From settings page

def capture_to_notion_lite(content, page_title="Inbox"):
    """Send a quick capture to Notion Lite"""
    try:
        response = requests.post(
            f"{NOTION_LITE_URL}/api/capture",
            headers={
                "x-api-key": API_KEY,
                "Content-Type": "application/json"
            },
            json={
                "content": content,
                "userId": USER_ID,
                "pageTitle": page_title
            }
        )
        
        if response.status_code == 200:
            return True, response.json()
        else:
            return False, response.text
            
    except Exception as e:
        return False, str(e)

# Replace your existing capture function
def on_hotkey_pressed(text):
    # Old code:
    # notion.pages.create(parent={"database_id": db_id}, properties={...})
    
    # New code:
    success, result = capture_to_notion_lite(text)
    if success:
        print(f"✓ Captured to inbox")
    else:
        print(f"✗ Failed: {result}")
```

### 3. Content Format Options

The API automatically detects different content types:

| Input | Result |
|-------|--------|
| `Remember to call Bob` | Regular paragraph |
| `[] Call the dentist` | Todo item |
| `[x] Finished report` | Completed todo |
| `TODO: Review budget` | Todo item |
| `- Buy groceries` | Todo item |

### 4. Advanced Features

#### Send to Different Pages
```python
# Send to a specific page
capture_to_notion_lite("Project idea", "Ideas")
capture_to_notion_lite("[] Weekly review", "GTD")
```

#### Batch Capture
```python
thoughts = [
    "[] Review Q4 goals",
    "Meeting notes from today",
    "[x] Sent invoice to client"
]

for thought in thoughts:
    capture_to_notion_lite(thought)
```

#### With Timestamps
```python
from datetime import datetime

content = f"[{datetime.now().strftime('%H:%M')}] {user_input}"
capture_to_notion_lite(content)
```

## Testing Your Integration

1. **Test the API first:**
   ```bash
   curl -X POST http://localhost:3002/api/capture \
     -H "x-api-key: your-api-key" \
     -H "Content-Type: application/json" \
     -d '{
       "content": "Test capture",
       "userId": "your-user-id",
       "pageTitle": "Inbox"
     }'
   ```

2. **Check your inbox:**
   - Open Notion Lite
   - Navigate to your Inbox page
   - Your test capture should appear

## Troubleshooting

### Common Issues

**401 Unauthorized**
- Check your API key is correct
- Make sure you saved the settings

**404 User not found**
- Verify your User ID is correct
- Ensure you're logged into Notion Lite

**500 Server Error**
- Check if Notion Lite is running
- Verify the URL is correct (localhost:3002 or your deployment URL)

### If Using Vercel Deployment

Update your Python app to use your Vercel URL:
```python
NOTION_LITE_URL = "https://your-app.vercel.app"
```

## Benefits of Migration

1. **Speed**: No external API calls to Notion
2. **Reliability**: Works offline if running locally
3. **Integration**: Automatic token processing
4. **Organization**: Direct to your GTD inbox
5. **No Rate Limits**: Capture as much as you want

## Keep Both Systems

You can also keep both systems running:
```python
def capture_everywhere(content):
    # Send to Notion Lite
    capture_to_notion_lite(content)
    
    # Also send to Notion (as backup)
    # your_existing_notion_capture(content)
```

## Need Help?

- Check the API status: `GET http://localhost:3002/api/capture`
- View logs in browser console (F12)
- Check Settings → Quick Capture for your credentials