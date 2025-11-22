"""
Simple test to verify LoggingHandler integration with Logan.

This test demonstrates how Logan can route logs to a standard Python logging handler,
enabling integration with OpenTelemetry and other logging frameworks.
"""

import logging
import time
from logan import Logan


class TestLoggingHandler(logging.Handler):
    """A simple test handler that captures log records."""

    def __init__(self):
        super().__init__()
        self.records = []

    def emit(self, record):
        """Capture the log record."""
        self.records.append(record)


def test_logging_handler_integration():
    """Test that Logan routes logs to the provided logging handler."""

    # Create a test handler
    test_handler = TestLoggingHandler()

    # Initialize Logan with the test handler
    print("Initializing Logan with custom logging handler...")
    Logan.init(logging_handler=test_handler)

    # Give the server time to start
    time.sleep(0.5)

    # Log messages at different levels
    print("\nLogging test messages...")
    Logan.info("This is an info message", namespace="test")
    Logan.warn("This is a warning message", namespace="test")
    Logan.error("This is an error message", namespace="test")
    Logan.debug("This is a debug message", namespace="test")

    # Give time for logs to be processed
    time.sleep(0.3)

    # Verify the handler received the logs
    print(f"\nVerifying handler received {len(test_handler.records)} log records...\n")

    assert len(test_handler.records) == 4, f"Expected 4 records, got {len(test_handler.records)}"

    # Verify log levels
    expected_levels = [logging.INFO, logging.WARNING, logging.ERROR, logging.DEBUG]
    actual_levels = [record.levelno for record in test_handler.records]
    assert actual_levels == expected_levels, f"Expected {expected_levels}, got {actual_levels}"

    # Verify logger names include namespace
    for record in test_handler.records:
        assert record.name == "logan.test", f"Expected 'logan.test', got '{record.name}'"

    # Verify messages
    expected_messages = [
        "This is an info message",
        "This is a warning message",
        "This is an error message",
        "This is a debug message"
    ]
    actual_messages = [record.getMessage() for record in test_handler.records]
    assert actual_messages == expected_messages, f"Expected {expected_messages}, got {actual_messages}"

    # Print details of captured records
    print("=" * 60)
    print("CAPTURED LOG RECORDS:")
    print("=" * 60)
    for i, record in enumerate(test_handler.records, 1):
        print(f"\nRecord {i}:")
        print(f"  Level: {logging.getLevelName(record.levelno)}")
        print(f"  Logger: {record.name}")
        print(f"  Message: {record.getMessage()}")
        print(f"  File: {record.pathname}:{record.lineno}")
        print(f"  Function: {record.funcName}")

    print("\n" + "=" * 60)
    print("TEST PASSED: All assertions successful!")
    print("=" * 60)


def test_with_exception():
    """Test that exceptions are properly passed to the logging handler."""

    # Create a test handler
    test_handler = TestLoggingHandler()

    # Initialize Logan with the test handler (server should already be running)
    Logan._logging_handler = test_handler

    # Create an exception
    try:
        raise ValueError("This is a test exception")
    except ValueError as e:
        Logan.error("An error occurred", namespace="error_test", exception=e)

    # Give time for log to be processed
    time.sleep(0.3)

    # Verify the exception was captured
    assert len(test_handler.records) >= 1, "Expected at least 1 record with exception"

    last_record = test_handler.records[-1]
    assert last_record.exc_info is not None, "Expected exc_info to be set"
    assert last_record.exc_info[0] == ValueError, "Expected ValueError exception type"

    print("\n" + "=" * 60)
    print("EXCEPTION TEST PASSED!")
    print("=" * 60)
    print(f"Exception type: {last_record.exc_info[0].__name__}")
    print(f"Exception message: {last_record.exc_info[1]}")
    print("=" * 60)


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("LOGAN LOGGING HANDLER INTEGRATION TEST")
    print("=" * 60 + "\n")

    # Run the main test
    test_logging_handler_integration()

    # Run the exception test
    print("\n\nTesting exception handling...\n")
    test_with_exception()

    print("\n" + "=" * 60)
    print("ALL TESTS PASSED!")
    print("=" * 60 + "\n")
