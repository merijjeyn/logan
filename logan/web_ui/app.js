class LogViewer {
    constructor() {
        this.MAX_LOGS = 2000; // Sliding window limit
        this.logs = [];
        this.filteredLogs = [];
        this.namespaces = new Set(['global']);
        this.eventSource = null;
        this.currentExpandedIndex = null;
        this.autoScrollEnabled = true;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectTimeout = null;
        
        
        this.initializeElements();
        this.attachEventListeners();
        this.connectEventSource();
    }
    
    initializeElements() {
        this.logsContainer = document.getElementById('logs');
        this.noLogsElement = document.getElementById('no-logs');
        this.typeDropdown = document.getElementById('type-dropdown');
        this.typeButton = document.getElementById('type-button');
        this.typeOptions = document.getElementById('type-options');
        this.typeSelected = document.getElementById('type-selected');
        this.namespaceDropdown = document.getElementById('namespace-dropdown');
        this.namespaceButton = document.getElementById('namespace-button');
        this.namespaceOptions = document.getElementById('namespace-options');
        this.namespaceSelected = document.getElementById('namespace-selected');
        this.clearFiltersBtn = document.getElementById('clear-filters');
        this.clearLogsBtn = document.getElementById('clear-logs');
        this.autoScrollToggle = document.getElementById('auto-scroll-toggle');
        this.logsContainerElement = document.getElementById('logs-container');
    }
    
    attachEventListeners() {
        // Type dropdown event listeners
        this.typeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown(this.typeDropdown);
        });
        
        this.typeOptions.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent dropdown from closing when clicking inside
        });
        
        this.typeOptions.addEventListener('change', () => {
            this.updateDropdownDisplay(this.typeOptions, this.typeSelected, 'All Types');
            this.applyFilters();
        });
        
        // Namespace dropdown event listeners
        this.namespaceButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown(this.namespaceDropdown);
        });
        
        this.namespaceOptions.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent dropdown from closing when clicking inside
        });
        
        this.namespaceOptions.addEventListener('change', () => {
            this.updateDropdownDisplay(this.namespaceOptions, this.namespaceSelected, 'All Namespaces');
            this.applyFilters();
        });
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            this.closeAllDropdowns();
        });
        
        this.clearFiltersBtn.addEventListener('click', () => {
            // Check all type filters
            this.typeOptions.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = true;
            });
            // Check all namespace filters
            this.namespaceOptions.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = true;
            });
            this.updateDropdownDisplay(this.typeOptions, this.typeSelected, 'All Types');
            this.updateDropdownDisplay(this.namespaceOptions, this.namespaceSelected, 'All Namespaces');
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
            // Don't toggle if clicking within the details panel
            if (event.target.closest('.log-details')) {
                return;
            }
            
            const logEntry = event.target.closest('.log-entry');
            if (logEntry) {
                const index = parseInt(logEntry.dataset.index);
                this.toggleLogDetails(index);
            }
        });
    }
    
    connectEventSource() {
        // Close existing connection if it exists
        if (this.eventSource) {
            this.eventSource.close();
        }
        
        // Clear any pending reconnection timeout
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        
        this.eventSource = new EventSource('/api/logs/stream');
        
        this.eventSource.onopen = () => {
            console.log('EventSource connected');
            // Reset reconnect attempts on successful connection
            this.reconnectAttempts = 0;
        };
        
        this.eventSource.onmessage = (event) => {
            const logData = JSON.parse(event.data);
            if (logData.type !== 'heartbeat') {
                this.addLog(logData);
            }
        };
        
        this.eventSource.onerror = (error) => {
            console.error('EventSource failed:', error);
            
            // Close the failed connection
            if (this.eventSource) {
                this.eventSource.close();
                this.eventSource = null;
            }
            
            // Only attempt reconnection if we haven't exceeded max attempts
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000); // Exponential backoff, max 30s
                console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
                
                this.reconnectTimeout = setTimeout(() => {
                    this.connectEventSource();
                }, delay);
            } else {
                console.error('Max reconnection attempts reached. Server appears to be down.');
            }
        };
    }
    
    addLog(logData) {
        this.logs.push(logData);
        
        // Sliding window: prevent unbounded memory growth
        if (this.logs.length > this.MAX_LOGS) {
            this.logs.shift(); // Remove oldest log
            // Remove the first DOM element as well
            if (this.logsContainer.firstChild) {
                this.logsContainer.removeChild(this.logsContainer.firstChild);
            }
        }
        
        // Add namespace to the filter dropdown if it's new
        const isNewNamespace = !this.namespaces.has(logData.namespace);
        if (isNewNamespace) {
            this.namespaces.add(logData.namespace);
            this.updateNamespaceFilter(logData.namespace);
        }
        
        // Check if the new log passes the active filters
        if (this.passesActiveFilters(logData)) {
            // Add DOM element for the new log directly
            const logIndex = this.logs.length - 1;
            const logElement = this.createLogElement(logData, logIndex);
            this.logsContainer.appendChild(logElement);
            
            // Hide the no-logs element if it's visible
            if (this.noLogsElement.style.display !== 'none') {
                this.noLogsElement.style.display = 'none';
            }
            
            // Auto-scroll if enabled
            if (this.autoScrollEnabled) {
                this.scrollToBottom();
            }
        }
    }
    
    updateNamespaceFilter(newNamespace = null) {
        const currentCheckboxes = this.namespaceOptions.querySelectorAll('input[type="checkbox"]');
        const currentSelection = Array.from(currentCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        
        this.namespaceOptions.innerHTML = '';
        
        Array.from(this.namespaces).sort().forEach(namespace => {
            const label = document.createElement('label');
            label.className = 'dropdown-option';
            
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
            
            this.namespaceOptions.appendChild(label);
        });
        
        // Update display after adding new namespace
        this.updateDropdownDisplay(this.namespaceOptions, this.namespaceSelected, 'All Namespaces');
    }
    
    applyFilters() {
        this.renderLogs();
    }
    
    passesActiveFilters(logData) {
        const selectedTypes = Array.from(this.typeOptions.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => cb.value);
        const selectedNamespaces = Array.from(this.namespaceOptions.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => cb.value);
        
        const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(logData.type);
        const namespaceMatch = selectedNamespaces.length === 0 || selectedNamespaces.includes(logData.namespace);
        return typeMatch && namespaceMatch;
    }
    
    renderLogs() {
        // Apply filters to get the filtered logs
        const selectedTypes = Array.from(this.typeOptions.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => cb.value);
        const selectedNamespaces = Array.from(this.namespaceOptions.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => cb.value);
        
        this.filteredLogs = this.logs.filter(log => {
            const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(log.type);
            const namespaceMatch = selectedNamespaces.length === 0 || selectedNamespaces.includes(log.namespace);
            return typeMatch && namespaceMatch;
        });
        
        // Clear the container and re-render all filtered logs
        this.logsContainer.innerHTML = '';
        
        if (this.filteredLogs.length === 0) {
            this.noLogsElement.style.display = 'block';
            return;
        }
        
        this.noLogsElement.style.display = 'none';
        
        // Create document fragment for efficient DOM updates
        const fragment = document.createDocumentFragment();
        
        // Render all filtered logs
        this.filteredLogs.forEach((log, index) => {
            // Use the original log index from this.logs for proper indexing
            const originalIndex = this.logs.indexOf(log);
            const logElement = this.createLogElement(log, originalIndex);
            fragment.appendChild(logElement);
        });
        
        // Add all logs at once
        this.logsContainer.appendChild(fragment);
        
        // Auto-scroll if enabled
        if (this.autoScrollEnabled) {
            this.scrollToBottom();
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
        
        // Show full message first
        detailsHTML += '<div class="full-message"><h4>Full Message:</h4>';
        detailsHTML += `<div class="full-message-content">${this.escapeHtml(log.message)}</div>`;
        detailsHTML += '</div>';
        
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
    
    toggleDropdown(dropdown) {
        // Close other dropdowns first
        this.closeAllDropdowns();
        // Toggle the clicked dropdown
        dropdown.classList.toggle('open');
    }
    
    closeAllDropdowns() {
        this.typeDropdown.classList.remove('open');
        this.namespaceDropdown.classList.remove('open');
    }
    
    updateDropdownDisplay(optionsContainer, displayElement, defaultText) {
        const checkedOptions = Array.from(optionsContainer.querySelectorAll('input[type="checkbox"]:checked'));
        const allOptions = Array.from(optionsContainer.querySelectorAll('input[type="checkbox"]'));
        
        if (checkedOptions.length === 0) {
            displayElement.textContent = 'None';
        } else if (checkedOptions.length === allOptions.length) {
            displayElement.textContent = defaultText;
        } else if (checkedOptions.length === 1) {
            displayElement.textContent = checkedOptions[0].value;
        } else {
            displayElement.textContent = `${checkedOptions.length} selected`;
        }
    }
}

// Initialize the log viewer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new LogViewer();
});