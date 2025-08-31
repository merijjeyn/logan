import json
import time
import traceback
import inspect
import socket
from datetime import datetime
from typing import Optional
import requests
from .server import LoganServer


class Logan:
    _server = None
    _server_url = None
    _port = None
    
    @classmethod
    def init(cls, max_port_attempts: int = 100):
        """Initialize Logan log viewer and start the Flask server on an available port."""
        if cls._server is not None:
            print("Logan server is already running")
            return
        
        # Find an available port
        port = cls._find_available_port(start_port=5000, max_attempts=max_port_attempts)
        
        cls._server = LoganServer(port=port)
        cls._server.run()  # starts the multiprocessing.Process directly
        cls._port = port
        
        # Wait a moment for server to start
        time.sleep(0.3)  # keep a short wait or replace with a health check later
        cls._server_url = f"http://localhost:{port}"
        
        # Display ASCII art and URL
        cls._display_startup_message(port)
    
    @classmethod
    def _find_available_port(cls, start_port: int = 5000, max_attempts: int = 100):
        """Find an available port starting from start_port."""
        for i in range(max_attempts):
            port = start_port + i
            if cls._is_port_available(port):
                return port
        
        raise RuntimeError(f"Could not find an available port after trying {max_attempts} ports starting from {start_port}")
    
    @classmethod
    def _is_port_available(cls, port: int) -> bool:
        """Check if a port is available for use."""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            try:
                sock.bind(('localhost', port))
                return True
            except OSError:
                return False
    
    @classmethod
    def _log(cls, message: str, type: str = "info", namespace: str = "global", exception: Optional[Exception] = None):
        """Send a log message to the Logan server."""
        if cls._server is None:
            cls._log_to_console(message, type, namespace, exception)
            return
        
        # Get caller information for callstack
        frame = inspect.currentframe()
        callstack = []
        try:
            while frame:
                if frame.f_code.co_filename != __file__:  # Skip Logan's own frames
                    callstack.append({
                        "file": frame.f_code.co_filename,
                        "line": frame.f_lineno,
                        "function": frame.f_code.co_name
                    })
                frame = frame.f_back
        finally:
            del frame
        
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "type": type,
            "message": message,
            "namespace": namespace,
            "callstack": callstack,
            "exception": None
        }
        
        if exception:
            log_entry["exception"] = {
                "message": str(exception),
                "traceback": traceback.format_exception(exception.__class__, exception, exception.__traceback__)
            }
        
        # Send log to server
        try:
            response = requests.post(f"{cls._server_url}/api/log", json=log_entry, timeout=1)
            if response.status_code != 200:
                print(f"Failed to send log: {response.status_code}")
        except requests.exceptions.RequestException:
            # Server might not be ready yet, ignore silently
            pass
    
    @classmethod
    def _log_to_console(cls, message: str, type: str, namespace: str, exception: Optional[Exception] = None):
        """Log message to console when server is not initialized."""
        # ANSI color codes
        colors = {
            "info": "\033[94m",     # Blue
            "warn": "\033[93m",     # Yellow
            "error": "\033[91m",    # Red
            "debug": "\033[90m",    # Gray
        }
        
        # Type symbols
        symbols = {
            "info": "ℹ",
            "warn": "⚠",
            "error": "✗",
            "debug": "○",
        }
        
        reset = "\033[0m"
        bold = "\033[1m"
        dim = "\033[2m"
        
        # Get timestamp
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        # Format the log line
        color = colors.get(type, colors["info"])
        symbol = symbols.get(type, symbols["info"])
        
        # Build the log line
        log_line = f"{dim}{timestamp}{reset} {color}{bold}{symbol} {type.upper()}{reset}"
        
        if namespace != "global":
            log_line += f" {dim}[{namespace}]{reset}"
        
        log_line += f" {message}"
        
        print(log_line)
        
        # Print exception if provided
        if exception:
            print(f"{color}  └─ Exception: {str(exception)}{reset}")
            if hasattr(exception, '__traceback__') and exception.__traceback__:
                tb_lines = traceback.format_exception(exception.__class__, exception, exception.__traceback__)
                for line in tb_lines[1:]:  # Skip the first line (redundant)
                    print(f"{dim}     {line.rstrip()}{reset}")
    
    @classmethod
    def _display_startup_message(cls, port: int):
        """Display the startup message with ASCII art."""
        ascii_art = cls._load_ascii_art()
        
        # ANSI color codes for eye-catching display
        GREEN = '\033[92m'
        BOLD = '\033[1m'
        RESET = '\033[0m'
        
        print(f"\n{GREEN}{BOLD}---------------------------------------------------")
        print(ascii_art + "\n")
        print(f"👀 View logs at: {BOLD}http://localhost:{port}")
        print(f"---------------------------------------------------{RESET}")
        print()
    
    @classmethod
    def _load_ascii_art(cls):
        """Load ASCII art from file."""
        from importlib import resources
        
        ascii_art_file = resources.files('logan') / 'assets' / 'ascii_art.txt'
        return ascii_art_file.read_text(encoding='utf-8')
    
    @classmethod
    def info(cls, message: str, namespace: str = "global"):
        """Log an info message."""
        cls._log(message, type="info", namespace=namespace)
    
    @classmethod
    def warn(cls, message: str, namespace: str = "global"):
        """Log a warning message."""
        cls._log(message, type="warn", namespace=namespace)
    
    @classmethod
    def error(cls, message: str, namespace: str = "global", exception: Optional[Exception] = None):
        """Log an error message."""
        cls._log(message, type="error", namespace=namespace, exception=exception)
    
    @classmethod
    def debug(cls, message: str, namespace: str = "global"):
        """Log a debug message."""
        cls._log(message, type="debug", namespace=namespace)