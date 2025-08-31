# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Logan is a Python log viewer with a web-based UI for real-time log monitoring. The architecture consists of:

- **Client (`logan/client.py`)**: The main `Logan` class that provides the logging API and manages server lifecycle
- **Server (`logan/server.py`)**: Flask-based web server that handles log ingestion and streaming via Server-Sent Events
- **Web UI (`logan/web_ui/`)**: Frontend with HTML, CSS, and JavaScript for the log viewer interface
- **Assets (`logan/assets/`)**: Static resources like ASCII art for startup messages

## Key Architecture Details

### Client-Server Communication
- Logan runs a Flask server in a separate subprocess using `multiprocessing.Process`
- Logs are sent from client to server via HTTP POST to `/api/log`
- Real-time streaming to web UI uses Server-Sent Events at `/api/logs/stream`
- The client automatically finds available ports starting from 5000

### Logging Flow
1. `Logan.init()` starts the server subprocess and displays startup message
2. Logging methods (`info`, `warn`, `error`, `debug`) capture call stacks using `inspect`
3. Log entries are JSON serialized and sent to the server
4. Server broadcasts logs to all connected web clients via queues

### Web UI Features
- Real-time log streaming with auto-scroll toggle
- Filtering by log type (info, warn, error, debug) and namespace
- Expandable log details showing call stacks and exceptions
- Dark theme optimized for development use

## Development Commands

### Installation
```bash
pip install -e .
```

### Running the Application
```bash
python main.py
```

### Testing
Copy the example notebook and run it:
```bash
cp test_logan.ipynb.example test_logan.ipynb
# Open and run the notebook
```

## Package Structure
- This is a Python package using `setuptools` with dependencies on Flask, requests, and waitress
- Web assets are included via `package_data` in setup.py
- The package entry point is the `Logan` class exported from `logan/__init__.py`