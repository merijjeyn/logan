#!/usr/bin/env python3

import time
import sys
import os

# Add the current directory to Python path so we can import logan
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from logan import Logan

def test_logan():
    print("Testing Logan log viewer...")
    
    # Initialize Logan (will automatically find an available port)
    Logan.init()
    
    # Give server time to start
    time.sleep(1)
    
    # Test different log types
    Logan.log("This is an info message", type="info", namespace="test")
    Logan.log("This is a warning message", type="warning", namespace="test") 
    Logan.log("This is an error message", type="error", namespace="app")
    Logan.log("This is a debug message", type="debug", namespace="debug")
    
    # Test with exception
    try:
        raise ValueError("This is a test exception")
    except Exception as e:
        Logan.log("An error occurred with exception", type="error", namespace="test", exception=e)
    
    # Test default namespace
    Logan.log("Message with default namespace")
    
    print(f"\n✅ Test completed! Logan is running - check the web interface!")
    print("Press Ctrl+C to exit")
    
    # Keep the script running so server stays alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n👋 Shutting down...")

if __name__ == "__main__":
    test_logan()