/**
 * XMLTableHandler: Enhanced class for XML data handling and table management
 * Version: 2.0
 * Debug Mode: Enabled
 * Last Updated: 2025-02-15
 */
class XMLTableHandler {
    constructor() {
        console.log('Initializing XMLTableHandler...');
        
        try {
            // Initialize DOM elements with error checking
            this.initializeDOMElements();
            
            // Define column structure
            this.defineColumns();
            
            // Initialize state variables
            this.initializeState();
            
            console.log('XMLTableHandler initialization successful');
        } catch (error) {
            console.error('Constructor Error:', error);
            this.showError('Failed to initialize table handler');
        }
      console.log('Table initialization:', {
        tableBody: this.tableBody?.id,
        tableVisible: this.tableBody?.offsetParent !== null,
        tableParentDisplay: this.tableContainer?.style.display,
        tableStyles: window.getComputedStyle(this.tableBody)
    });  
    }

    /**
     * Initialize and validate all required DOM elements
     * @throws {Error} If required elements are not found
     */
    initializeDOMElements() {
        const required_elements = {
            'checksTable': 'tableBody',
            'search': 'searchInput',
            'narCategory': 'narFilter',
            'tableContainer': 'tableContainer',
            'emptyState': 'emptyState',
            'result': 'resultContainer'
        };

        for (const [id, prop] of Object.entries(required_elements)) {
            const element = document.getElementById(id);
            if (!element) {
                throw new Error(`Required element #${id} not found in DOM`);
            }
            this[prop] = element;
            console.log(`✓ Found ${id} element`);
        }
    }

    /**
     * Define column structure and types
     */
    defineColumns() {
        this.columns = {
            NARRATION: { index: 0, type: 'string', required: true },
            AMOUNT: { index: 1, type: 'number', required: true },
            CHEQ_NO: { index: 2, type: 'number', required: true },
            NAR: { index: 3, type: 'string', required: true },
            DD: { index: 4, type: 'string', required: true }
        };
        console.log('Column structure defined:', Object.keys(this.columns));
    }

    /**
     * Initialize state variables
     */
    initializeState() {
        this.enableLiveUpdate = false;
        this.tableResetEnabled = true;
        this.BackspaceDefault = true;
        this.xmlData = '';
        this.lastSearchTerm = '';
        this.lastFilterCategory = 'all';
        console.log('State variables initialized');
    }

    /**
     * Set up all event listeners with error handling
     */
    initializeEventListeners() {
        console.log('Setting up event listeners...');

        try {
            // Search input events
            this.setupSearchListeners();
            
            // NAR filter events
            this.setupNarFilterListeners();
            
            console.log('Event listeners setup complete');
        } catch (error) {
            console.error('Error in event listener setup:', error);
            this.showError('Failed to initialize event handlers');
        }
    }

    /**
     * Set up search-related event listeners
     */
    setupSearchListeners() {
        // Keydown event for search
        this.searchInput.addEventListener('keydown', (e) => {
            console.log('Search keydown event:', e.key);
            
            if (e.key === 'Enter') {
                console.log('Enter key pressed - triggering search');
                this.search();
            }

            if (e.key === 'Backspace' && this.tableResetEnabled) {
                this.handleBackspace();
            }
        });

        // Input event for live updates
        this.searchInput.addEventListener('input', () => {
            if (this.enableLiveUpdate) {
                console.log('Live update triggered');
                this.search();
            }
        });
    }

    /**
     * Handle backspace key logic
     */
    handleBackspace() {
        const inputBefore = this.searchInput.value.trim();
        
        setTimeout(() => {
            const inputAfter = this.searchInput.value.trim();
            console.log('Backspace handling:', { before: inputBefore, after: inputAfter });

            if (this.BackspaceDefault && inputBefore.length > 1) {
                const caretPosition = this.searchInput.selectionStart;
                this.resetTable();
                this.searchInput.value = inputAfter;
                this.searchInput.setSelectionRange(caretPosition, caretPosition);
                this.BackspaceDefault = false;
                console.log('Table reset after backspace');
            }

            if (inputAfter.length > 0) {
                this.BackspaceDefault = true;
            }
        }, 0);
    }

    /**
     * Set up NAR filter event listeners
     */
    setupNarFilterListeners() {
        if (this.narFilter) {
            this.narFilter.addEventListener('change', () => {
                console.log('NAR filter changed:', this.narFilter.value);
                this.filterByNar();
            });
        } else {
            console.warn('NAR filter element not found');
        }
    }

    /**
     * Fetch and process XML data
     */
    async fetchXMLData() {
        console.log('Starting XML data fetch...');
        
        try {
            const filesResponse = await this.fetchWithTimeout('/accounts.office.cheque.inquiry/public/data/files.json');
            const xmlFiles = await filesResponse.json();
            console.log(`Found ${xmlFiles.length} XML files to process`);

            let combinedXMLData = '<root>';
            for (const file of xmlFiles) {
                console.log(`Fetching file: ${file}`);
                const fileResponse = await this.fetchWithTimeout(`/accounts.office.cheque.inquiry/public/data/${file}`);
                combinedXMLData += await fileResponse.text();
            }
            combinedXMLData += '</root>';

            // Validate XML structure
            if (!this.validateXMLStructure(combinedXMLData)) {
                throw new Error('Invalid XML structure detected');
            }

            localStorage.setItem('xmlData', combinedXMLData);
            this.xmlData = combinedXMLData;
            console.log('XML data successfully fetched and stored');

            return this.parseXMLToTable(combinedXMLData);
        } catch (error) {
            console.error('XML fetch error:', error);
            return this.handleXMLFetchError(error);
        }
    }

    /**
     * Fetch with timeout wrapper
     */
    async fetchWithTimeout(url, timeout = 5000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(id);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    }

    /**
     * Validate XML structure
     */
    validateXMLStructure(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");
        
        if (xmlDoc.querySelector('parsererror')) {
            console.error('XML validation failed');
            return false;
        }

        const gPvnElements = xmlDoc.getElementsByTagName('G_PVN');
        if (gPvnElements.length === 0) {
            console.error('No G_PVN elements found in XML');
            return false;
        }

        return true;
    }

    /**
     * Handle XML fetch errors
     */
    handleXMLFetchError(error) {
        console.log('Attempting to recover from XML fetch error...');
        const storedXML = localStorage.getItem('xmlData');
        
        if (storedXML) {
            console.log('Found stored XML data, attempting to use it');
            return this.parseXMLToTable(storedXML);
        }
        
        this.showError(`Failed to load XML data: ${error.message}`);
        return false;
    }

    /**
     * Parse XML and create table
     */
   parseXMLToTable(xmlString = null) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString || this.xmlData, "text/xml");
        
        if (xmlDoc.querySelector('parsererror')) {
            throw new Error('XML parsing error');
        }

        const gPvnElements = xmlDoc.getElementsByTagName('G_PVN');
        if (!this.tableBody) {
            throw new Error('Table body element not found');
        }

        this.tableBody.innerHTML = '';
        Array.from(gPvnElements).forEach((element) => {
            const row = this.createTableRow(element);
            this.tableBody.appendChild(row);
        });

        return true;
    } catch (error) {
        console.error('Error in parseXMLToTable:', error);
        this.showError('Failed to parse XML data');
        return false;
    }
}

createTableRow(element) {
    const row = document.createElement('tr');

    Object.keys(this.columns).forEach(field => {
        const cell = document.createElement('td');
        let value = element.getElementsByTagName(field)[0]?.textContent?.trim() || '';

        if (field === 'AMOUNT') {
            try {
                value = parseFloat(value).toLocaleString('en-US');
            } catch (error) {
                console.warn(`Invalid amount value: ${value}`);
                value = '0';
            }
        }

        cell.textContent = value;
        cell.setAttribute('data-field', field);

        if (field === 'DD') {
            let ddValue = value.toLowerCase();
            if (ddValue.includes('despatched through gpo')) {
                cell.classList.add('status-orange');
            } else if (ddValue.includes('ready but not signed yet') || ddValue.includes('cheque ready')) {
                cell.classList.add('status-green');
            } else if (ddValue.includes('despatched to lakki camp office')) {
                cell.classList.add('status-red');
            } else if (ddValue.includes('sent to chairman sb. for sign')) {
                cell.classList.add('status-blue');
            } else {
                cell.classList.add('status-gray');
            }
        }

        row.appendChild(cell);
    });

    return row;
}
    
    /**
     * Create a table cell with proper formatting
     */
    createTableCell(element, field) {
        const cell = document.createElement('td');
        let value = this.getElementContent(element, field);

        if (field === 'AMOUNT') {
            value = this.formatAmount(value);
        }

        cell.textContent = value;
        cell.setAttribute('data-field', field);

        if (field === 'DD') {
            this.applyStatusStyles(cell, value);
        }

        return cell;
    }

    /**
     * Get and validate element content
     */
   getElementContent(element, field) {
    const fieldElement = element.getElementsByTagName(field)[0];
    console.log(`Processing field ${field}:`, {
        elementExists: !!fieldElement,
        value: fieldElement?.textContent,
        parentElement: element.tagName
    });
    
    const content = fieldElement?.textContent?.trim() || '';
    
    if (this.columns[field].required && !content) {
        console.warn(`Required field ${field} is empty`, {
            element: element,
            availableFields: Array.from(element.children).map(child => child.tagName)
        });
    }
    return content;
}

    /**
     * Format amount values
     */
    formatAmount(value) {
        try {
            return parseFloat(value).toLocaleString('en-US');
        } catch (error) {
            console.warn(`Invalid amount value: ${value}`);
            return '0';
        }
    }

    /**
     * Apply status-based styles to cells
     */
    applyStatusStyles(cell, value) {
        const ddValue = value.toLowerCase();
        const statusMap = {
            'despatched through gpo': 'status-orange',
            'ready but not signed yet': 'status-green',
            'cheque ready': 'status-green',
            'despatched to lakki camp office': 'status-red',
            'sent to chairman sb. for sign': 'status-blue'
        };

        let statusApplied = false;
        for (const [key, className] of Object.entries(statusMap)) {
            if (ddValue.includes(key)) {
                cell.classList.add(className);
                statusApplied = true;
                break;
            }
        }

        if (!statusApplied) {
            cell.classList.add('status-gray');
        }
    }

    /**
     * Perform search operation
     */
    search() {
        const searchTerm = this.searchInput.value.toLowerCase();
        console.log('Performing search:', searchTerm);

        if (!searchTerm) {
            console.log('Empty search term - resetting table');
            return this.resetTable();
        }

        this.updateTableVisibility(true);
        let matchCount = 0;

        this.tableBody.querySelectorAll('tr').forEach(row => {
            const matchesSearch = Array.from(row.getElementsByTagName('td'))
                .some(cell => cell.textContent.toLowerCase().includes(searchTerm));
            row.style.display = matchesSearch ? '' : 'none';
            if (matchesSearch) matchCount++;
        });

        console.log(`Search complete: ${matchCount} matches found`);
        this.updateSearchResults(searchTerm, matchCount);
    }

    /**
     * Update search results display
     */
    updateSearchResults(searchTerm, matchCount) {
        const message = matchCount > 0
            ? `Found ${matchCount} results for "${searchTerm}"`
            : 'No results found.';
        
        this.resultContainer.innerHTML = message;
        console.log('Search results updated:', message);
    }

    /**
     * Filter by NAR category
     */
    filterByNar() {
        const selectedCategory = this.narFilter.value.toLowerCase();
        console.log('Filtering by NAR category:', selectedCategory);

        let matchCount = 0;
        this.tableBody.querySelectorAll('tr').forEach(row => {
            const narValue = row.getAttribute('data-nar');
            const visible = (selectedCategory === "all" || narValue.includes(selectedCategory));
            row.style.display = visible ? '' : 'none';
            if (visible) matchCount++;
        });

        console.log(`Filter complete: ${matchCount} rows visible`);
    }

    /**
     * Reset table to initial state
     */
    resetTable() {
        console.log('Resetting table to initial state');
        
        this.searchInput.value = '';
        if (this.narFilter) {
            this.narFilter.value = 'all';
        }
        
        this.updateTableVisibility(false);
        this.tableBody.querySelectorAll('tr').forEach(row => row.style.display = '');
    }

    /**
     * Update table visibility state
     */
    updateTableVisibility(visible) {
        this.tableContainer.style.display = visible ? 'block' : 'none';
        this.emptyState.style.display = visible ? 'none' : 'block';
        this.resultContainer.style.display = visible ? 'block' : 'none';
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('Error:', message);
        this.resultContainer.innerHTML = `<div class="error-message">${message}</div>`;
        this.resultContainer.style.display = 'block';
    }
}

// Initialize handler with error catching
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing XMLTableHandler');
    
    try {
        const handler = new XMLTableHandler();
        handler.fetchXMLData().then(() => {
            console.log('Initial data fetch complete');
            handler.resetTable();
        }).catch(error => {
            console.error('Initialization error:', error);
        });
    } catch (error) {
        console.error('Fatal initialization error:', error);
    }
});

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/accounts.office.cheque.inquiry/service-worker.js', { scope: '/accounts.office.cheque.inquiry/' })
            .then(registration => console.log('ServiceWorker registered:', registration.scope))
            .catch(err => console.error('ServiceWorker registration failed:', err));
    });
}
