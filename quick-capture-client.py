"""
Quick Capture Client for Notion Lite
=====================================
This script can be integrated into your existing Python quick capture app
to send thoughts to Notion Lite instead of Notion directly.

Replace your Notion API calls with the send_to_notion_lite function.
"""

import requests
import json
from typing import Optional

# Configuration - Update these values
NOTION_LITE_URL = "http://localhost:3002"  # Change to your deployed URL if using Vercel
API_KEY = "quick-capture-dev-key"  # Use a secure key in production
USER_ID = "YOUR_USER_ID"  # Get this from Notion Lite settings page

def send_to_notion_lite(content: str, page_title: str = "Inbox") -> bool:
    """
    Send a quick capture to Notion Lite
    
    Args:
        content: The text to capture (can start with [] for todo, [x] for done todo)
        page_title: The page to add to (default: "Inbox")
    
    Returns:
        True if successful, False otherwise
    """
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
            result = response.json()
            print(f"✓ Captured to {page_title}: {content[:50]}...")
            return True
        else:
            print(f"✗ Failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False

def capture_with_hotkey():
    """
    Example function to integrate with your existing hotkey capture
    """
    import keyboard
    import tkinter as tk
    from tkinter import simpledialog
    
    def on_hotkey():
        # Create a simple input dialog
        root = tk.Tk()
        root.withdraw()  # Hide the main window
        root.attributes('-topmost', True)  # Keep on top
        
        # Get input from user
        thought = simpledialog.askstring(
            "Quick Capture", 
            "Enter your thought:\n(Start with [] for todo, [x] for completed)",
            parent=root
        )
        
        if thought:
            # Send to Notion Lite
            if send_to_notion_lite(thought):
                # Show success briefly
                success_window = tk.Toplevel(root)
                success_window.attributes('-topmost', True)
                success_window.overrideredirect(True)
                label = tk.Label(success_window, text="✓ Captured!", 
                               bg="green", fg="white", font=("Arial", 12))
                label.pack(padx=20, pady=10)
                
                # Position at top-right of screen
                success_window.update_idletasks()
                w = success_window.winfo_width()
                h = success_window.winfo_height()
                x = root.winfo_screenwidth() - w - 20
                y = 20
                success_window.geometry(f"+{x}+{y}")
                
                # Auto-close after 1 second
                root.after(1000, success_window.destroy)
                root.after(1100, root.destroy)
            else:
                root.destroy()
        else:
            root.destroy()
    
    # Register hotkey (Ctrl+Q)
    keyboard.add_hotkey('ctrl+q', on_hotkey)
    print("Quick Capture ready! Press Ctrl+Q to capture.")
    print("Press Ctrl+C to exit.")
    
    try:
        keyboard.wait()  # Keep the script running
    except KeyboardInterrupt:
        print("\nExiting...")

# Example usage patterns
if __name__ == "__main__":
    print("Notion Lite Quick Capture Examples")
    print("=" * 40)
    
    # Example 1: Simple thought
    send_to_notion_lite("Remember to review the quarterly report")
    
    # Example 2: Todo item
    send_to_notion_lite("[] Call the dentist for appointment")
    
    # Example 3: Completed todo
    send_to_notion_lite("[x] Finished the presentation slides")
    
    # Example 4: Send to specific page
    send_to_notion_lite("Project idea: AI-powered note-taking", "Ideas")
    
    print("\n" + "=" * 40)
    print("To use with hotkey, uncomment the line below:")
    # capture_with_hotkey()