#!/usr/bin/env python3
"""
Quick Capture Debug Script
==========================
This script helps test and debug the Quick Capture API integration.
"""

import requests
import json
import sys
from datetime import datetime

# Configuration - UPDATE THESE VALUES
NOTION_LITE_URL = "http://localhost:3002"  # Change if using different URL
API_KEY = "quick-capture-dev-key"  # Your API key from settings
USER_ID = "YOUR_USER_ID_HERE"  # Your user ID from settings

def test_api_status():
    """Test if the API is accessible"""
    print("\n🔍 Testing API Status...")
    print(f"   URL: {NOTION_LITE_URL}/api/capture")
    
    try:
        response = requests.get(f"{NOTION_LITE_URL}/api/capture")
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✅ API is accessible")
            data = response.json()
            print(f"   Message: {data.get('message', 'No message')}")
            return True
        else:
            print(f"   ❌ Unexpected status code: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("   ❌ Connection failed - Is Notion Lite running?")
        print(f"   Check that the app is running at {NOTION_LITE_URL}")
        return False
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False

def test_capture(content, show_details=True):
    """Test capturing content"""
    print(f"\n📝 Testing Capture: '{content}'")
    
    # Prepare the request
    url = f"{NOTION_LITE_URL}/api/capture"
    headers = {
        "x-api-key": API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "content": content,
        "userId": USER_ID,
        "pageTitle": "Inbox"
    }
    
    if show_details:
        print(f"   URL: {url}")
        print(f"   API Key: {API_KEY[:10]}..." if len(API_KEY) > 10 else API_KEY)
        print(f"   User ID: {USER_ID}")
    
    try:
        # Make the request
        response = requests.post(url, headers=headers, json=payload)
        
        print(f"   Status Code: {response.status_code}")
        
        # Parse response
        try:
            data = response.json()
        except:
            print(f"   Response Text: {response.text}")
            return False
        
        if response.status_code == 200:
            print("   ✅ Capture successful!")
            if show_details:
                print(f"   Block ID: {data.get('blockId', 'N/A')}")
                print(f"   Page ID: {data.get('pageId', 'N/A')}")
                if 'debug' in data:
                    print(f"   Debug Info: {json.dumps(data['debug'], indent=6)}")
            return True
            
        elif response.status_code == 401:
            print(f"   ❌ Authentication failed")
            print(f"   Error: {data.get('error', 'Unknown')}")
            print(f"   Your API key: {API_KEY}")
            print(f"   Received key: {data.get('receivedKey', 'Not shown')}")
            print("\n   Fix: Check your API key in Settings → Quick Capture")
            return False
            
        elif response.status_code == 400:
            print(f"   ❌ Bad request")
            print(f"   Error: {data.get('error', 'Unknown')}")
            if 'received' in data:
                print(f"   Received fields: {data['received']}")
            print("\n   Fix: Ensure USER_ID is correct")
            return False
            
        else:
            print(f"   ❌ Unexpected error")
            print(f"   Error: {data.get('error', 'Unknown')}")
            if 'details' in data:
                print(f"   Details: {data['details']}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"   ❌ Connection failed")
        print(f"   Cannot connect to {NOTION_LITE_URL}")
        print("   Is Notion Lite running?")
        return False
        
    except Exception as e:
        print(f"   ❌ Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def run_all_tests():
    """Run a comprehensive test suite"""
    print("=" * 60)
    print("NOTION LITE QUICK CAPTURE - DEBUG TEST SUITE")
    print("=" * 60)
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Target URL: {NOTION_LITE_URL}")
    print(f"User ID: {USER_ID}")
    
    # Test 1: API Status
    if not test_api_status():
        print("\n⚠️  API is not accessible. Please check:")
        print("1. Notion Lite is running")
        print(f"2. The URL is correct: {NOTION_LITE_URL}")
        return
    
    # Test 2: Check configuration
    if USER_ID == "YOUR_USER_ID_HERE":
        print("\n⚠️  USER_ID not configured!")
        print("Please update USER_ID in this script with your actual User ID")
        print("You can find it in Notion Lite: Settings → Quick Capture")
        return
    
    # Test 3: Various content types
    test_cases = [
        "Simple text capture",
        "[] Todo item to complete",
        "[x] Completed todo item",
        "TODO: Task with TODO prefix",
        "- Task with dash prefix",
        f"Timestamped: {datetime.now().strftime('%H:%M')} - Meeting notes"
    ]
    
    print("\n" + "=" * 60)
    print("TESTING DIFFERENT CONTENT TYPES")
    print("=" * 60)
    
    success_count = 0
    for i, content in enumerate(test_cases, 1):
        print(f"\nTest {i}/{len(test_cases)}:")
        if test_capture(content, show_details=(i == 1)):  # Show details only for first test
            success_count += 1
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"✅ Passed: {success_count}/{len(test_cases)}")
    print(f"❌ Failed: {len(test_cases) - success_count}/{len(test_cases)}")
    
    if success_count == len(test_cases):
        print("\n🎉 All tests passed! Your Quick Capture is working correctly.")
        print("Check your Inbox page in Notion Lite to see the captured items.")
    elif success_count > 0:
        print("\n⚠️  Some tests failed. Check the errors above.")
    else:
        print("\n❌ All tests failed. Please check your configuration.")

def interactive_mode():
    """Interactive testing mode"""
    print("\n" + "=" * 60)
    print("INTERACTIVE CAPTURE MODE")
    print("=" * 60)
    print("Type your thoughts and press Enter to capture")
    print("Commands: 'exit' to quit, 'test' to run tests")
    print("-" * 60)
    
    while True:
        try:
            content = input("\n> ").strip()
            
            if content.lower() == 'exit':
                print("Goodbye!")
                break
            elif content.lower() == 'test':
                run_all_tests()
            elif content:
                test_capture(content)
            else:
                print("Please enter some content to capture")
                
        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "test":
            run_all_tests()
        elif sys.argv[1] == "interactive":
            interactive_mode()
        else:
            # Capture directly from command line
            content = " ".join(sys.argv[1:])
            test_capture(content)
    else:
        # Default: Show menu
        print("\n" + "=" * 60)
        print("NOTION LITE QUICK CAPTURE DEBUG TOOL")
        print("=" * 60)
        print("\nUsage:")
        print("  python test-capture.py test          # Run all tests")
        print("  python test-capture.py interactive   # Interactive mode")
        print("  python test-capture.py 'Your text'   # Capture directly")
        print("\nCurrent Configuration:")
        print(f"  URL: {NOTION_LITE_URL}")
        print(f"  User ID: {USER_ID}")
        print(f"  API Key: {API_KEY[:10]}..." if len(API_KEY) > 10 else f"  API Key: {API_KEY}")
        print("\nWhat would you like to do?")
        print("1. Run all tests")
        print("2. Interactive mode")
        print("3. Exit")
        
        choice = input("\nChoice (1-3): ").strip()
        
        if choice == "1":
            run_all_tests()
        elif choice == "2":
            interactive_mode()
        else:
            print("Goodbye!")