import json
import threading
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
    _server_thread = None
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
        cls._server_thread = threading.Thread(target=cls._server.run, daemon=True)
        cls._server_thread.start()
        cls._port = port
        
        # Wait a moment for server to start
        time.sleep(0.5)
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
    def log(cls, message: str, type: str = "info", namespace: str = "global", exception: Optional[Exception] = None):
        """Send a log message to the Logan server."""
        if cls._server is None:
            print("Logan not initialized. Call Logan.init() first.")
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
        import pkg_resources
        ascii_art_path = pkg_resources.resource_filename('logan', 'assets/ascii_art.txt')
        with open(ascii_art_path, 'r', encoding='utf-8') as f:
            return f.read()