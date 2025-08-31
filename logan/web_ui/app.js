class LogViewer {
    constructor() {
        this.MAX_LOGS = 1000; // Sliding window limit
        this.logs = [];
        this.filteredLogs = [];
        this.renderedCount = 0; // Track how many logs are already rendered
        this.namespaces = new Set(['global']);
        this.eventSource = null;
        this.currentExpandedIndex = null;
        this.autoScrollEnabled = true;
        
        // Debounced rendering to prevent render spam
        this.renderTimeout = null;
        this.RENDER_DEBOUNCE_MS = 16; // ~60fps
        
        this.initializeElements();
        this.attachEventListeners();
        this.connectEventSource();
    }
    
    initializeElements() {
        this.logsContainer = document.getElementById('logs');
        this.noLogsElement = document.getElementById('no-logs');
        this.typeFilters = document.getElementById('type-filters');
        this.namespaceFilters = document.getElementById('namespace-filters');
        this.clearFiltersBtn = document.getElementById('clear-filters');
        this.clearLogsBtn = document.getElementById('clear-logs');
        this.autoScrollToggle = document.getElementById('auto-scroll-toggle');
        this.logsContainerElement = document.getElementById('logs-container');
    }
    
    attachEventListeners() {
        // Add event listeners for type filter checkboxes
        this.typeFilters.addEventListener('change', () => this.applyFilters());
        
        // Add event listeners for namespace filter checkboxes  
        this.namespaceFilters.addEventListener('change', () => this.applyFilters());
        
        this.clearFiltersBtn.addEventListener('click', () => {
            // Check all type filters
            this.typeFilters.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = true;
            });
            // Check all namespace filters
            this.namespaceFilters.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = true;
            });
            this.applyFilters();
        });
        
        this.clearLogsBtn.addEventListener('click', () => {
            this.logs = [];
            this.filteredLogs = [];
            this.renderLogs();
        });
        
        // Auto-scroll toggle button
        this.autoScrollToggle.addEventListener('click', () => {
            this.toggleAutoScroll();
        });
        
        // Keyboard shortcut for auto-scroll toggle
        document.addEventListener('keydown', (event) => {
            if (event.key.toLowerCase() === 's' && !event.ctrlKey && !event.metaKey && !event.altKey) {
                // Only trigger if not typing in an input field
                if (event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
                    event.preventDefault();
                    this.toggleAutoScroll();
                }
            }
        });
        
        // EVENT DELEGATION: Single listener for all log clicks (prevents memory leaks)
        this.logsContainer.addEventListener('click', (event) => {
            const logEntry = event.target.closest('.log-entry');
            if (logEntry) {
                const index = parseInt(logEntry.dataset.index);
                this.toggleLogDetails(index);
            }
        });
    }
    
    connectEventSource() {
        this.eventSource = new EventSource('/api/logs/stream');
        
        this.eventSource.onmessage = (event) => {
            const logData = JSON.parse(event.data);
            if (logData.type !== 'heartbeat') {
                this.addLog(logData);
            }
        };
        
        this.eventSource.onerror = (error) => {
            console.error('EventSource failed:', error);
            setTimeout(() => this.connectEventSource(), 5000);
        };
    }
    
    addLog(logData) {
        this.logs.push(logData);
        
        // Sliding window: prevent unbounded memory growth
        if (this.logs.length > this.MAX_LOGS) {
            this.logs.shift(); // Remove oldest log
        }
        
        // Add namespace to the filter dropdown if it's new
        const isNewNamespace = !this.namespaces.has(logData.namespace);
        if (isNewNamespace) {
            this.namespaces.add(logData.namespace);
            this.updateNamespaceFilter(logData.namespace);
        }
        
        this.debouncedRender();
    }
    
    updateNamespaceFilter(newNamespace = null) {
        const currentCheckboxes = this.namespaceFilters.querySelectorAll('input[type="checkbox"]');
        const currentSelection = Array.from(currentCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        
        this.namespaceFilters.innerHTML = '';
        
        Array.from(this.namespaces).sort().forEach(namespace => {
            const label = document.createElement('label');
            label.className = 'toggle-label';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = namespace;
            
            // Auto-select new namespaces, or maintain current selection for existing ones
            if (newNamespace && namespace === newNamespace) {
                checkbox.checked = true; // Always select new namespaces
            } else {
                checkbox.checked = currentSelection.length === 0 || currentSelection.includes(namespace);
            }
            
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(' ' + namespace));
            
            this.namespaceFilters.appendChild(label);
        });
    }
    
    applyFilters() {
        const selectedTypes = Array.from(this.typeFilters.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => cb.value);
        const selectedNamespaces = Array.from(this.namespaceFilters.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => cb.value);
        
        this.filteredLogs = this.logs.filter(log => {
            const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(log.type);
            const namespaceMatch = selectedNamespaces.length === 0 || selectedNamespaces.includes(log.namespace);
            return typeMatch && namespaceMatch;
        });
        
        this.renderLogs();
    }
    
    debouncedRender() {
        // Cancel previous render if pending
        if (this.renderTimeout) {
            clearTimeout(this.renderTimeout);
        }
        
        // Schedule new render
        this.renderTimeout = setTimeout(() => {
            this.applyFilters();
            if (this.autoScrollEnabled) {
                this.scrollToBottom();
            }
            this.renderTimeout = null;
        }, this.RENDER_DEBOUNCE_MS);
    }
    
    renderLogs() {
        if (this.filteredLogs.length === 0) {
            this.noLogsElement.style.display = 'block';
            this.logsContainer.innerHTML = '';
            this.renderedCount = 0;
            return;
        }
        
        this.noLogsElement.style.display = 'none';
        
        // Only render new logs that haven't been rendered yet
        const newLogsCount = this.filteredLogs.length - this.renderedCount;
        
        if (newLogsCount > 0) {
            // Create document fragment for efficient DOM updates
            const fragment = document.createDocumentFragment();
            
            // Only process the new logs
            for (let i = this.renderedCount; i < this.filteredLogs.length; i++) {
                const log = this.filteredLogs[i];
                const logElement = this.createLogElement(log, i);
                fragment.appendChild(logElement);
            }
            
            // Add all new logs at once
            this.logsContainer.appendChild(fragment);
            this.renderedCount = this.filteredLogs.length;
        }
        
        // Handle case where logs were removed (sliding window)
        if (this.logsContainer.children.length > this.filteredLogs.length) {
            // Remove excess DOM elements from the beginning
            const excessCount = this.logsContainer.children.length - this.filteredLogs.length;
            for (let i = 0; i < excessCount; i++) {
                this.logsContainer.removeChild(this.logsContainer.firstChild);
            }
            this.renderedCount = this.filteredLogs.length;
        }
    }
    
    createLogElement(log, index) {
        const logDiv = document.createElement('div');
        logDiv.className = `log-entry ${log.type}`;
        logDiv.dataset.index = index;
        
        const timestamp = new Date(log.timestamp).toLocaleTimeString();
        
        logDiv.innerHTML = `
            <div class="log-content">
                <span class="log-timestamp">${timestamp}</span>
                <span class="log-type ${log.type}">${log.type}</span>
                <span class="log-message">${this.escapeHtml(log.message)}</span>
                <span class="log-namespace">${log.namespace}</span>
            </div>
            <div class="log-details" id="details-${index}">
                ${this.renderLogDetails(log)}
            </div>
        `;
        
        // Event listener removed - using event delegation instead
        return logDiv;
    }
    
    renderLogDetails(log) {
        let detailsHTML = '';
        
        // Render exception first (above regular callstack)
        if (log.exception) {
            detailsHTML += '<div class="exception"><h4>Exception Traceback:</h4>';
            if (log.exception.traceback) {
                detailsHTML += `<div class="exception-traceback">${this.escapeHtml(log.exception.traceback.join(''))}</div>`;
            }
            detailsHTML += '</div>';
        }
        
        // Render regular callstack
        if (log.callstack && log.callstack.length > 0) {
            detailsHTML += '<div class="callstack"><h4>Callstack:</h4>';
            log.callstack.forEach(frame => {
                detailsHTML += `
                    <div class="callstack-item">
                        ${this.escapeHtml(frame.file)}:${frame.line} in ${frame.function}()
                    </div>
                `;
            });
            detailsHTML += '</div>';
        }
        
        return detailsHTML;
    }
    
    toggleLogDetails(index) {
        // Close currently expanded log if it exists
        if (this.currentExpandedIndex !== null && this.currentExpandedIndex !== index) {
            const currentDetails = document.getElementById(`details-${this.currentExpandedIndex}`);
            if (currentDetails) {
                currentDetails.classList.remove('expanded');
            }
        }
        
        // Toggle the clicked log
        const detailsElement = document.getElementById(`details-${index}`);
        const isExpanding = !detailsElement.classList.contains('expanded');
        
        detailsElement.classList.toggle('expanded');
        
        // Update the current expanded index
        this.currentExpandedIndex = isExpanding ? index : null;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    toggleAutoScroll() {
        this.autoScrollEnabled = !this.autoScrollEnabled;
        
        if (this.autoScrollEnabled) {
            this.autoScrollToggle.textContent = 'Auto-scroll (S)';
            this.autoScrollToggle.className = 'auto-scroll-enabled';
            // Scroll to bottom when re-enabling auto-scroll
            this.scrollToBottom();
        } else {
            this.autoScrollToggle.textContent = 'Auto-scroll OFF (S)';
            this.autoScrollToggle.className = 'auto-scroll-disabled';
        }
    }
    
    scrollToBottom() {
        // Use requestAnimationFrame for smooth, non-blocking scroll
        requestAnimationFrame(() => {
            if (this.logsContainerElement) {
                this.logsContainerElement.scrollTop = this.logsContainerElement.scrollHeight;
            }
        });
    }
}

// Initialize the log viewer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new LogViewer();
});