# Logan: A Python Log Viewer with Web UI

We want to build a Python utility that allows developers to easily log messages from their Python applications into a browser-based log viewer. The tool should be simple to use, real-time, and visually clear.

## Core Developer Experience

- Usage is minimal:

```
Logan.init()
Logan.log("some message", type="info", namespace="myns")
```

- Only two static methods are exposed:
  - init() – starts the log viewer
  - log() – sends a log message (with type, namespace, optional exception)
- When init() is called:
  - A local Flask server starts automatically.
  - The console prints a browser URL to view logs, highlighted with eye-catching color and ASCII art.
  - The ASCII art should be configurable by loading it from a .txt file.
- Installing this package is enough — no extra setup is required.

## Log Viewer Requirements (Web UI)

- Log formatting:
  - Info → gray
  - Warning → yellow
  - Error → red
  - Debug → blue
- Each log entry shows: time → type → message → namespace
- Default namespace is "global".
- Clicking a log expands a scrollable details panel showing:
  - Full log message (if clipped)
  - Callstack of the logging call
  - If an exception is included: exception message + exception callstack
- Filtering:
  - Filter logs by type and namespace.
- Realtime updates:
  - Logs appear instantly, with no refresh or polling delays.

## System Architecture

The project has three decoupled modules:

### 1. Python Client

- Provides the init() and log() methods.
- Calling init() starts the Flask server.
- Calling log() sends logs to the server.

### 2. Flask Server

- Started by the Python client.
- Responsibilities:
  - Serves the Web UI (HTML/CSS/JS).
  - Streams logs to the browser using Server-Sent Events (SSE).

### 3. Web UI

- Implemented in vanilla HTML, CSS, and JS.
- No external dependencies except a single dynamic script tag.
- Resides in its own folder, which the Flask server serves statically.
