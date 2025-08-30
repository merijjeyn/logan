import json
import threading
from queue import Queue
from flask import Flask, render_template_string, request, Response, send_from_directory
import pkg_resources
import os


class LoganServer:
    def __init__(self, port=5000):
        self.port = port
        self.app = Flask(__name__)
        self.log_queue = Queue()
        self.clients = set()
        self.lock = threading.Lock()
        
        # Setup routes
        self.setup_routes()
    
    def setup_routes(self):
        @self.app.route('/')
        def index():
            return self.serve_web_ui()
        
        @self.app.route('/api/log', methods=['POST'])
        def receive_log():
            log_data = request.get_json()
            
            # Add log to queue and notify all clients
            with self.lock:
                self.log_queue.put(log_data)
                # Broadcast to all connected clients
                for client_queue in self.clients:
                    try:
                        client_queue.put(log_data)
                    except:
                        pass
            
            return {'status': 'ok'}, 200
        
        @self.app.route('/api/logs/stream')
        def stream_logs():
            def generate():
                client_queue = Queue()
                
                # Add this client to the clients set
                with self.lock:
                    self.clients.add(client_queue)
                
                try:
                    while True:
                        try:
                            log_data = client_queue.get(timeout=30)  # 30 second timeout
                            yield f"data: {json.dumps(log_data)}\n\n"
                        except Exception:
                            # Send heartbeat to keep connection alive
                            yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"
                except GeneratorExit:
                    pass
                finally:
                    # Remove client when connection closes
                    with self.lock:
                        self.clients.discard(client_queue)
            
            response = Response(generate(), mimetype='text/event-stream')
            response.headers['Cache-Control'] = 'no-cache'
            response.headers['Connection'] = 'keep-alive'
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response
        
        @self.app.route('/web_ui/<path:filename>')
        def serve_static(filename):
            web_ui_dir = pkg_resources.resource_filename('logan', 'web_ui')
            return send_from_directory(web_ui_dir, filename)
    
    def serve_web_ui(self):
        web_ui_path = pkg_resources.resource_filename('logan', 'web_ui/index.html')
        with open(web_ui_path, 'r') as f:
            return f.read()
    
    
    def run(self):
        self.app.run(host='0.0.0.0', port=self.port, debug=False, threaded=True)