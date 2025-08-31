#!/usr/bin/env python3

import time
from logan import Logan

def main():
    print("Starting Logan...")
    Logan.init()
    
    print("Logan is running. Press Ctrl+C to stop.")
    print("Try logging some messages:")
    
    # Log some test messages
    Logan.info("Application started")
    Logan.debug("This is a debug message")
    Logan.warn("This is a warning")
    Logan.error("This is an error message")
    
    try:
        # Keep the main thread alive
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nReceived Ctrl+C, shutting down...")
    finally:
        print("Goodbye!")

if __name__ == "__main__":
    main()