#!/usr/bin/env python3
"""
Working Quick Capture for Notion Lite
======================================
This is a verified working script for your quick capture integration.
Update the configuration below with your actual values.
"""

import requests
import json

# ============================================
# CONFIGURATION - UPDATE THESE VALUES
# ============================================
NOTION_LITE_URL = "http://localhost:3002"  # Or your Vercel URL
API_KEY = "quick-capture-dev-key"          # Your API key
USER_ID = "0bnt7oYu8zfqw09XRd3otDT8Fbo2"  # Your actual user ID

def capture_to_notion_lite(content):
    """
    Send a quick capture to Notion Lite
    
    Args:
        content: The text to capture
    
    Returns:
        tuple: (success: bool, response: dict)
    """
    url = f"{NOTION_LITE_URL}/api/capture"
    
    headers = {
        "x-api-key": API_KEY,
        "Content-Type": "application/json"
    }
    
    data = {
        "content": content,
        "userId": USER_ID,
        "pageTitle": "Inbox"
    }
    
    try:
        # Important: Use allow_redirects=True to follow the redirect
        response = requests.post(url, headers=headers, json=data, allow_redirects=True)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Captured: {content[:50]}...")
            print(f"   Block ID: {result.get('blockId')}")
            return True, result
        else:
            print(f"❌ Failed with status {response.status_code}")
            print(f"   Response: {response.text}")
            return False, response.json() if response.text else {}
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False, {"error": str(e)}

# ============================================
# INTEGRATION WITH YOUR HOTKEY APP
# ============================================

def integrate_with_your_app():
    """
    Replace your existing Notion API call with this function
    """
    # Your existing code probably looks something like:
    # notion.pages.create(parent={"database_id": INBOX_DB_ID}, ...)
    
    # Replace it with:
    def on_capture(text):
        success, response = capture_to_notion_lite(text)
        if success:
            # Optional: Show success notification
            print("Captured to Notion Lite!")
        else:
            # Optional: Show error notification
            print("Capture failed!")
        return success
    
    return on_capture

# ============================================
# EXAMPLES
# ============================================

if __name__ == "__main__":
    print("Testing Notion Lite Quick Capture")
    print("=" * 40)
    
    # Test different content types
    test_items = [
        "Remember to check email",           # Regular note
        "[] Call the dentist",               # Todo item
        "[x] Finished the report",           # Completed todo
        "TODO: Review quarterly goals",      # Alternative todo format
    ]
    
    for item in test_items:
        print(f"\nCapturing: {item}")
        success, response = capture_to_notion_lite(item)
        if not success:
            print(f"Failed: {response}")
    
    print("\n" + "=" * 40)
    print("✅ Check your Inbox page in Notion Lite!")
    print(f"   URL: {NOTION_LITE_URL}/app")