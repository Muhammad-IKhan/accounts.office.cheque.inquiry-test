/**
 * XMLTableHandler: Production-ready implementation for XML data table management
 * Version: 4.0
 * Last Updated: 2025-02-16
 * 
 * SETUP INSTRUCTIONS:
 * 1. Include required HTML elements with specified IDs (see HTML structure below)
 * 2. Include required CSS (Bootstrap 5.x recommended)
 * 3. Initialize the handler after DOM content is loaded
 * 
 * Required HTML Structure:
 * <div class="container">
 *   <div class="row mb-3">
 *     <div class="col">
 *       <input type="text" id="search" class="form-control" placeholder="Search...">
 *     </div>
 *     <div class="col">
 *       <select id="statusFilter" class="form-select">
 *         <option value="all">All Statuses</option>
 *       </select>
 *     </div>
 *   </div>
 *   <div id="tableContainer">
 *     <table id="chequeTable" class="table">
 *       <thead>
 *         <tr>
 *           <th data-column="NARRATION">Narration</th>
 *           <th data-column="AMOUNT">Amount</th>
 *           <th data-column="CHEQ_NO">Cheque No</th>
 *           <th data-column="NAR">NAR</th>
 *           <th data-column="DD">Status</th>
 *         </tr>
 *       </thead>
 *       <tbody id="checksTable"></tbody>
 *     </table>
 *   </div>
 *   <div id="emptyState" style="display: none;">
 *     <p>No results found</p>
 *   </div>
 *   <div id="result" class="mt-3"></div>
 *   <div id="paginationContainer" class="mt-3"></div>
 * </div>
 */

class XMLTableHandler {
    /**
     * Initialize the XMLTableHandler with all required components
     */
    constructor() {
        console.log('🚀 Initializing XMLTableHandler...');
        
        try {
            this.initializeDOMElements();
            this.defineColumns();
            this.initializeState();
            this.initializeEventListeners();
            
            console.log('✅ XMLTableHandler initialization successful');
        } catch (error) {
            console.error('❌ Constructor Error:', error);
            this.showError('Failed to initialize table handler');
        }
    }

    /**
     * Initialize and validate all required DOM elements
     * @throws {Error} If required elements are not found
     */
    initializeDOMElements() {
        console.log('🔍 Initializing DOM elements...');

        const required_elements = {
            'checksTable': 'tableBody',
            'search': 'searchInput',
            'narCategory': 'narFilter',
            'statusFilter': 'statusFilter',
            'tableContainer': 'tableContainer',
            'emptyState': 'emptyState',
            'result': 'resultContainer',
            'paginationContainer': 'paginationContainer'
        };

        for (const [id, prop] of Object.entries(required_elements)) {
            const element = document.getElementById(id);
            if (!element) {
                console.error(`❌ Required element #${id} not found`);
                throw new Error(`Required element #${id} not found in DOM`);
            }
            this[prop] = element;
            console.log(`✓ Found ${id} element`);
        }
    }

    /**
     * Define table column structure and data types
     */
    defineColumns() {
        console.log('📊 Defining column structure...');

        this.columns = {
            NARRATION: { index: 0, type: 'string', required: true },
            AMOUNT: { index: 1, type: 'number', required: true },
            CHEQ_NO: { index: 2, type: 'number', required: true },
            NAR: { index: 3, type: 'string', required: true },
            DD: { index: 4, type: 'string', required: true }
        };

        console.log('✓ Column structure defined:', Object.keys(this.columns));
    }

    /**
     * Initialize state variables
     */
    initializeState() {
        console.log('🔄 Initializing state...');

        this.enableLiveUpdate = false;
        this.tableResetEnabled = true;
        this.BackspaceDefault = true;
        this.xmlData = '';
        this.lastSearchTerm = '';
        this.currentStatusFilter = 'all';
        this.lastFilterCategory = 'all';
        this.rowsPerPage = 10;
        this.currentPage = 1;
        this.visibleRowsCount = 0;

        console.log('✓ State initialized');
    }

    /**
     * Initialize all event listeners
     */
    initializeEventListeners() {
        console.log('👂 Setting up event listeners...');

        try {
            this.setupSearchListeners();
            this.setupStatusFilterListeners();
            this.setupNarFilterListeners();
            this.setupSorting();
            this.initializePagination();

            console.log('✅ Event listeners setup complete');
        } catch (error) {
            console.error('❌ Error in event listener setup:', error);
            this.showError('Failed to initialize event handlers');
        }
    }

    /**
     * Set up search-related event listeners
     */
    setupSearchListeners() {
        console.log('🔍 Setting up search listeners...');

        // Search input keydown event
        this.searchInput.addEventListener('keydown', (e) => {
            console.log('🔑 Search keydown event:', e.key);
            
            if (e.key === 'Enter') {
                console.log('↩️ Enter key pressed - triggering search');
                this.search();
            }

            if (e.key === 'Backspace' && this.tableResetEnabled) {
                this.handleBackspace();
            }
        });

        // Search button click event
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                console.log('🔍 Search button clicked');
                this.search();
            });
        }
    }

    /**
     * Set up status filter event listeners
     */
    setupStatusFilterListeners() {
        console.log('🔄 Setting up status filter listeners...');

        if (this.statusFilter) {
            this.statusFilter.addEventListener('change', () => {
                console.log('📊 Status filter changed:', this.statusFilter.value);
                this.currentStatusFilter = this.statusFilter.value.toLowerCase();
                this.applyFilters();
            });
        } else {
            console.warn('⚠️ Status filter element not found');
        }
    }

    /**
     * Apply all active filters to the table
     */
    applyFilters() {
        console.log('🔄 Applying filters - Status:', this.currentStatusFilter, 'Search:', this.lastSearchTerm);

        let matchCount = 0;
        const searchTerm = this.searchInput.value.toLowerCase();

        this.tableBody.querySelectorAll('tr').forEach(row => {
            // Check status filter
            const statusCell = row.querySelector('td[data-field="DD"]');
            const statusValue = statusCell ? statusCell.textContent.toLowerCase() : '';
            const matchesStatus = this.currentStatusFilter === 'all' || 
                                statusValue === this.currentStatusFilter;

            // Check search term
            const matchesSearch = !searchTerm || Array.from(row.getElementsByTagName('td'))
                .some(cell => cell.textContent.toLowerCase().includes(searchTerm));

            // Apply combined filtering
            const isVisible = matchesStatus && matchesSearch;
            row.style.display = isVisible ? '' : 'none';
            if (isVisible) matchCount++;
        });

        console.log(`✓ Filter applied: ${matchCount} matches found`);
        this.visibleRowsCount = matchCount;
        this.updateSearchResults(searchTerm, matchCount);
        this.updatePaginationVisibility();
        this.renderPage(1);
    }

    /**
     * Perform search operation
     */
    search() {
        const searchTerm = this.searchInput.value.toLowerCase();
        console.log('🔍 Performing search:', searchTerm);

        if (!searchTerm && this.currentStatusFilter === 'all') {
            console.log('↩️ No filters active - resetting table');
            return this.resetTable();
        }

        this.lastSearchTerm = searchTerm;
        this.applyFilters();
    }

    /**
     * Update search results display
     */
    updateSearchResults(searchTerm, matchCount) {
        let message = '';
        if (this.currentStatusFilter !== 'all') {
            const statusText = this.statusFilter.options[this.statusFilter.selectedIndex].text;
            message = `Showing ${matchCount} ${statusText} records`;
            if (searchTerm) {
                message += ` matching "${searchTerm}"`;
            }
        } else if (searchTerm) {
            message = `Found ${matchCount} results for "${searchTerm}"`;
        }
        
        this.resultContainer.innerHTML = message;
        this.updateTableVisibility(matchCount > 0);
        console.log('📊 Results updated:', message);
    }

    /**
     * Reset table to initial state
     */
    resetTable() {
        console.log('🔄 Resetting table to initial state');
        
        this.searchInput.value = '';
        this.lastSearchTerm = '';
        this.currentStatusFilter = 'all';
        
        if (this.narFilter) this.narFilter.value = 'all';
        if (this.statusFilter) this.statusFilter.value = 'all';
        
        this.tableBody.querySelectorAll('tr').forEach(row => row.style.display = '');
        this.visibleRowsCount = this.tableBody.querySelectorAll('tr').length;
        
        this.updateTableVisibility(true);
        this.updatePaginationVisibility();
        this.renderPage(1);
        this.resultContainer.innerHTML = '';
        
        console.log('✅ Table reset complete');
    }

    /**
     * Initialize status and NAR filters from XML data
     */
    initializeFilters(entries) {
        console.log('🔄 Initializing filters...');

        // Initialize Status filter
        if (this.statusFilter) {
            const statusValues = new Set(Array.from(entries)
                .map(entry => entry.getElementsByTagName('DD')[0]?.textContent)
                .filter(Boolean));

            this.statusFilter.innerHTML = '<option value="all">All Statuses</option>';
            [...statusValues].sort().forEach(value => {
                const option = document.createElement('option');
                option.value = value.toLowerCase();
                option.textContent = value;
                this.statusFilter.appendChild(option);
            });
            console.log('✓ Status filter initialized with', statusValues.size, 'options');
        }

        // Initialize NAR filter
        if (this.narFilter) {
            const narValues = new Set(Array.from(entries)
                .map(entry => entry.getElementsByTagName('NAR')[0]?.textContent)
                .filter(Boolean));

            this.narFilter.innerHTML = '<option value="all">All Categories</option>';
            [...narValues].sort().forEach(value => {
                const option = document.createElement('option');
                option.value = value.toLowerCase();
                option.textContent = value;
                this.narFilter.appendChild(option);
            });
            console.log('✓ NAR filter initialized with', narValues.size, 'options');
        }
    }

    /**
     * Update pagination visibility based on data
     */
    updatePaginationVisibility() {
        if (this.paginationContainer) {
            const shouldShow = this.visibleRowsCount > this.rowsPerPage;
            this.paginationContainer.style.display = shouldShow ? 'block' : 'none';
            console.log(`${shouldShow ? '👁️' : '🚫'} Pagination visibility:`, shouldShow);
        }
    }

    /**
     * Update table visibility state
     */
    updateTableVisibility(visible) {
        this.tableContainer.style.display = visible ? 'block' : 'none';
        this.emptyState.style.display = visible ? 'none' : 'block';
        console.log(`👁️ Table visibility set to:`, visible);
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('❌ Error:', message);
        this.resultContainer.innerHTML = `<div class="alert alert-danger">${message}</div>`;
        this.resultContainer.style.display = 'block';
    }

    /**
     * Process XML data and update table
     */
    processXMLData(xmlString) {
        console.log('🔄 Processing XML data...');

        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "text/xml");
            
            if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
                throw new Error("Invalid XML format");
            }

            const entries = xmlDoc.getElementsByTagName("entry");
            this.populateTable(entries);
            this.initializeFilters(entries);
            
            console.log(`✅ Processed ${entries.length} XML entries successfully`);
            return true;
        } catch (error) {
            console.error("❌ XML Processing Error:", error);
            this.showError("Failed to process XML data");
            return false;
        }
    }
}

// Initialize handler with error catching
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌟 DOM Content Loaded - Initializing XMLTableHandler');
    
    try {
        const handler = new XMLTableHandler();
        console.log('✨ XMLTableHandler instance created');
        
        // Example XML data loading (replace with your data source)
        const sampleXML = `
            <?xml version="1.0" encoding="UTF-8"?>
            <entries>
                <entry>
                    <NARRATION>Sample Entry 1</NARRATION>
                    <AMOUNT>1000</AMOUNT>
                    <CHEQ_NO>12345</CHEQ_NO>
                    <NAR>Category A</NAR>
                    <DD>Pending</DD>
                </entry>
                <!-- Add more entries as needed -->
            </entries>
        `;
        
        handler.processXMLData(sampleXML);
    } catch (error) {
        console.error('❌ Fatal initialization error:', error);
    }
});

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/accounts.office.cheque.inquiry/service-worker.js', {
            scope: '/accounts.office.cheque.inquiry/'
        }).then(registration => {
            console.log('ServiceWorker registered:', registration.scope);
        }).catch(err => {
            console.error('ServiceWorker registration failed:', err);
        });
    });
}
