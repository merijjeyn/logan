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
pip install git+https://github.com/merijjeyn/logan.git
```

### Basic Usage

```python
from logan import Logan

# Initialize the log viewer (starts web server)
Logan.init()

# Log messages with different types and namespaces
Logan.info("Application started", namespace="app")
Logan.info("Database connected", namespace="db")
Logan.warn("Invalid input detected", namespace="validation")
Logan.error("Connection failed", namespace="network")
Logan.debug("Processing user request", namespace="api")

# Log exceptions with full stack traces
try:
    result = 10 / 0
except Exception as e:
    Logan.error("Math operation failed", namespace="calc", exception=e)
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

### Logging Methods

#### `Logan.info(message, namespace="global")`
Log an info message.

#### `Logan.warn(message, namespace="global")`
Log a warning message.

#### `Logan.error(message, namespace="global", exception=None)`
Log an error message. Optionally include an exception for stack trace.

#### `Logan.debug(message, namespace="global")`
Log a debug message.

**Parameters:**

- `message` (str): The log message
- `namespace` (str, optional): Namespace/component name for organizing logs. Defaults to "global".
- `exception` (Exception, optional): Python exception object to include stack trace (error method only).

## Examples

### Web Application Logging

```python
from logan import Logan
from flask import Flask

Logan.init(port=5001)
app = Flask(__name__)

@app.route("/")
def home():
    Logan.info("Home page accessed", namespace="web")
    return "Hello World"

@app.route("/api/users")
def get_users():
    Logan.debug("Fetching users from database", namespace="api")
    try:
        # Database operation
        users = fetch_users()
        Logan.info(f"Retrieved {len(users)} users", namespace="api")
        return users
    except Exception as e:
        Logan.error("Failed to fetch users", namespace="api", exception=e)
        return {"error": "Failed to fetch users"}, 500
```

### Data Processing Pipeline

```python
from logan import Logan
import pandas as pd

Logan.init()

def process_data(filename):
    Logan.info(f"Starting data processing for {filename}", namespace="pipeline")

    try:
        # Load data
        Logan.debug("Loading CSV file", namespace="io")
        df = pd.read_csv(filename)
        Logan.info(f"Loaded {len(df)} records", namespace="io")

        # Process data
        Logan.debug("Applying transformations", namespace="transform")
        df_processed = df.dropna().reset_index(drop=True)
        Logan.info(f"Cleaned data: {len(df_processed)} records remaining", namespace="transform")

        # Save results
        output_file = f"processed_{filename}"
        df_processed.to_csv(output_file, index=False)
        Logan.info(f"Results saved to {output_file}", namespace="io")

    except FileNotFoundError as e:
        Logan.error(f"Input file not found: {filename}", namespace="io", exception=e)
    except Exception as e:
        Logan.error("Unexpected error during processing", namespace="pipeline", exception=e)

process_data("data.csv")
```

## Development

To set up for development:

```bash
git clone https://github.com/merijjeyn/logan.git
cd logan
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -e .
```

### Local Testing

Just copy `test_logan.ipynb.example`, remove the .example suffix, and go nuts

## License

MIT License - see LICENSE file for details.
