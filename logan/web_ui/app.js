class LogViewer {
    constructor() {
        this.logs = [];
        this.filteredLogs = [];
        this.namespaces = new Set(['global']);
        this.eventSource = null;
        this.currentExpandedIndex = null;
        
        this.initializeElements();
        this.attachEventListeners();
        this.connectEventSource();
    }
    
    initializeElements() {
        this.logsContainer = document.getElementById('logs');
        this.noLogsElement = document.getElementById('no-logs');
        this.typeFilter = document.getElementById('type-filter');
        this.namespaceFilter = document.getElementById('namespace-filter');
        this.clearFiltersBtn = document.getElementById('clear-filters');
        this.clearLogsBtn = document.getElementById('clear-logs');
        
        // Select all types by default
        Array.from(this.typeFilter.options).forEach(option => {
            option.selected = true;
        });
    }
    
    attachEventListeners() {
        this.typeFilter.addEventListener('change', () => this.applyFilters());
        this.namespaceFilter.addEventListener('change', () => this.applyFilters());
        
        this.clearFiltersBtn.addEventListener('click', () => {
            Array.from(this.typeFilter.options).forEach(option => option.selected = true);
            Array.from(this.namespaceFilter.options).forEach(option => option.selected = true);
            this.applyFilters();
        });
        
        this.clearLogsBtn.addEventListener('click', () => {
            this.logs = [];
            this.filteredLogs = [];
            this.renderLogs();
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
        
        // Add namespace to the filter dropdown if it's new
        const isNewNamespace = !this.namespaces.has(logData.namespace);
        if (isNewNamespace) {
            this.namespaces.add(logData.namespace);
            this.updateNamespaceFilter(logData.namespace);
        }
        
        this.applyFilters();
        this.scrollToBottom();
    }
    
    updateNamespaceFilter(newNamespace = null) {
        const currentSelection = Array.from(this.namespaceFilter.selectedOptions).map(opt => opt.value);
        
        this.namespaceFilter.innerHTML = '';
        
        Array.from(this.namespaces).sort().forEach(namespace => {
            const option = document.createElement('option');
            option.value = namespace;
            option.textContent = namespace;
            // Auto-select new namespaces, or maintain current selection for existing ones
            if (newNamespace && namespace === newNamespace) {
                option.selected = true; // Always select new namespaces
            } else {
                option.selected = currentSelection.length === 0 || currentSelection.includes(namespace);
            }
            this.namespaceFilter.appendChild(option);
        });
    }
    
    applyFilters() {
        const selectedTypes = Array.from(this.typeFilter.selectedOptions).map(opt => opt.value);
        const selectedNamespaces = Array.from(this.namespaceFilter.selectedOptions).map(opt => opt.value);
        
        this.filteredLogs = this.logs.filter(log => {
            const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(log.type);
            const namespaceMatch = selectedNamespaces.length === 0 || selectedNamespaces.includes(log.namespace);
            return typeMatch && namespaceMatch;
        });
        
        this.renderLogs();
    }
    
    renderLogs() {
        if (this.filteredLogs.length === 0) {
            this.noLogsElement.style.display = 'block';
            this.logsContainer.innerHTML = '';
            return;
        }
        
        this.noLogsElement.style.display = 'none';
        this.logsContainer.innerHTML = '';
        
        this.filteredLogs.forEach((log, index) => {
            const logElement = this.createLogElement(log, index);
            this.logsContainer.appendChild(logElement);
        });
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
        
        logDiv.addEventListener('click', () => {
            this.toggleLogDetails(index);
        });
        
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
    
    scrollToBottom() {
        const logsContainer = document.getElementById('logs-container');
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }
}

// Initialize the log viewer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new LogViewer();
});