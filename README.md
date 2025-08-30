# Logan: Python Log Viewer with Web UI

A simple, real-time log viewer for Python applications with a beautiful dark-themed web interface.

## Features

- 🌐 **Web-based UI** - View logs in your browser with real-time updates
- 🎨 **Dark theme** - Easy on the eyes during development
- 🏷️ **Log types** - Support for info, warning, error, and debug logs
- 📁 **Namespaces** - Organize logs by component/module
- 🔍 **Filtering** - Toggle filters for types and namespaces
- 📋 **Expandable details** - Click logs to see call stacks and exceptions
- ⏸️ **Auto-scroll toggle** - Press 'S' to pause/resume auto-scrolling
- ⚡ **Real-time streaming** - Logs appear instantly via Server-Sent Events

## Quick Start

### Installation

```bash
pip install git+https://github.com/yourusername/logan.git
```

### Basic Usage

```python
from logan import Logan

# Initialize the log viewer (starts web server)
Logan.init()

# Log messages with different types and namespaces
Logan.log("Application started", type="info", namespace="app")
Logan.log("Database connected", type="info", namespace="db")
Logan.log("Invalid input detected", type="warning", namespace="validation")
Logan.log("Connection failed", type="error", namespace="network")
Logan.log("Processing user request", type="debug", namespace="api")

# Log exceptions with full stack traces
try:
    result = 10 / 0
except Exception as e:
    Logan.log("Math operation failed", type="error", namespace="calc", exception=e)
```

### Web Interface

After calling `Logan.init()`, open your browser to the URL displayed in the console (typically `http://localhost:5000`). The interface provides:

- **Individual filter toggles** for log types and namespaces
- **Click any log entry** to expand and see detailed call stack information
- **Auto-scroll toggle** (press 'S' key or click button) to pause/resume following new logs
- **Clear buttons** to reset filters or clear all logs

## API Reference

### `Logan.init(port=5000)`

Starts the Logan web server.

**Parameters:**
- `port` (int, optional): Port number for the web server. Defaults to 5000.

### `Logan.log(message, type="info", namespace="global", exception=None)`

Sends a log message to the web viewer.

**Parameters:**
- `message` (str): The log message
- `type` (str, optional): Log type - "info", "warning", "error", or "debug". Defaults to "info".
- `namespace` (str, optional): Namespace/component name for organizing logs. Defaults to "global".
- `exception` (Exception, optional): Python exception object to include stack trace. Defaults to None.

## Examples

### Web Application Logging
```python
from logan import Logan
from flask import Flask

Logan.init(port=5001)
app = Flask(__name__)

@app.route("/")
def home():
    Logan.log("Home page accessed", type="info", namespace="web")
    return "Hello World"

@app.route("/api/users")
def get_users():
    Logan.log("Fetching users from database", type="debug", namespace="api")
    try:
        # Database operation
        users = fetch_users()
        Logan.log(f"Retrieved {len(users)} users", type="info", namespace="api")
        return users
    except Exception as e:
        Logan.log("Failed to fetch users", type="error", namespace="api", exception=e)
        return {"error": "Failed to fetch users"}, 500
```

### Data Processing Pipeline
```python
from logan import Logan
import pandas as pd

Logan.init()

def process_data(filename):
    Logan.log(f"Starting data processing for {filename}", namespace="pipeline")
    
    try:
        # Load data
        Logan.log("Loading CSV file", type="debug", namespace="io")
        df = pd.read_csv(filename)
        Logan.log(f"Loaded {len(df)} records", type="info", namespace="io")
        
        # Process data
        Logan.log("Applying transformations", type="debug", namespace="transform")
        df_processed = df.dropna().reset_index(drop=True)
        Logan.log(f"Cleaned data: {len(df_processed)} records remaining", namespace="transform")
        
        # Save results
        output_file = f"processed_{filename}"
        df_processed.to_csv(output_file, index=False)
        Logan.log(f"Results saved to {output_file}", type="info", namespace="io")
        
    except FileNotFoundError as e:
        Logan.log(f"Input file not found: {filename}", type="error", namespace="io", exception=e)
    except Exception as e:
        Logan.log("Unexpected error during processing", type="error", namespace="pipeline", exception=e)

process_data("data.csv")
```

## Development

To set up for development:

```bash
git clone https://github.com/yourusername/logan.git
cd logan
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -e .
```

## License

MIT License - see LICENSE file for details.