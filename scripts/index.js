/**
 * XMLTableHandler Class
 * Manages XML data processing, table operations, filtering, and sorting functionality
 * Author: Muhammad-IKhan
 * Last Updated: 2025-02-15 16:47:29 UTC
 */
class XMLTableHandler {
    /**
     * Initializes the XMLTableHandler with necessary DOM elements and configurations
     * @constructor
     */
    constructor() {
        console.log('[XMLTableHandler] Initializing handler...', new Date().toISOString());
        
        // DOM Elements initialization
        this.initializeDOMElements();
        
        // Column configuration with data types
        this.initializeColumns();
        
        // Control flags
        this.initializeFlags();
        
        // Set up event listeners
        this.initializeEventListeners();
        
        console.log('[XMLTableHandler] Initialization complete');
    }

    /**
     * Initializes all required DOM elements
     * @private
     */
    initializeDOMElements() {
        console.log('[XMLTableHandler] Setting up DOM elements...');
        
        this.tableBody = document.getElementById('checksTable');
        this.searchInput = document.getElementById('search');
        this.narFilter = document.getElementById('narCategory');
        this.tableContainer = document.getElementById('tableContainer');
        this.emptyState = document.getElementById('emptyState');
        this.resultContainer = document.getElementById('result');
        
        // Validate critical DOM elements
        if (!this.tableBody || !this.searchInput || !this.narFilter) {
            console.error('[XMLTableHandler] Critical DOM elements missing');
            throw new Error('Required DOM elements not found');
        }
    }

    /**
     * Initializes column definitions and their data types
     * @private
     */
    initializeColumns() {
        console.log('[XMLTableHandler] Configuring table columns...');
        
        this.columns = {
            NARRATION: { index: 0, type: 'string', sortable: true },
            AMOUNT: { index: 1, type: 'number', sortable: true },
            CHEQ_NO: { index: 2, type: 'number', sortable: true },
            NAR: { index: 3, type: 'string', sortable: true },
            DD: { index: 4, type: 'string', sortable: true }
        };
        
        // Track current sort state
        this.currentSortColumn = null;
        this.sortDirection = 'asc';
    }

    /**
     * Initializes control flags for table behavior
     * @private
     */
    initializeFlags() {
        this.enableLiveUpdate = false;  // Control live search updates
        this.tableResetEnabled = true;  // Control table reset behavior
        this.BackspaceDefault = true;   // Control backspace behavior
        console.log('[XMLTableHandler] Control flags initialized');
    }

    /**
     * Sets up all event listeners for table interactions
     * @private
     */
    initializeEventListeners() {
        console.log('[XMLTableHandler] Setting up event listeners...');

        // Search input event handlers
        this.setupSearchEvents();
        
        // NAR filter events
        this.setupNarFilterEvents();
        
        // Table sorting events
        this.setupSortingEvents();
        
        console.log('[XMLTableHandler] Event listeners setup complete');
    }

    /**
     * Configures search input related events
     * @private
     */
    setupSearchEvents() {
        console.log('[XMLTableHandler] Configuring search events...');
        
        // Backspace handling
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && this.tableResetEnabled) {
                console.log('[Search] Backspace pressed');
                this.handleBackspace();
            }
            if (e.key === 'Enter') {
                console.log('[Search] Enter key pressed, performing search');
                this.search();
            }
        });

        // Live search handling
        this.searchInput.addEventListener('input', () => {
            if (this.enableLiveUpdate) {
                console.log('[Search] Live update triggered');
                this.search();
            }
        });
    }

    /**
     * Handles backspace functionality in search
     * @private
     */
    handleBackspace() {
        let inputBefore = this.searchInput.value.trim();
        setTimeout(() => {
            let inputAfter = this.searchInput.value.trim();
            console.log(`[Search] Backspace: Before="${inputBefore}", After="${inputAfter}"`);
            
            if (this.BackspaceDefault && inputBefore.length > 1) {
                let caretPosition = this.searchInput.selectionStart;
                this.resetTable();
                this.searchInput.value = inputAfter;
                this.searchInput.setSelectionRange(caretPosition, caretPosition);
                this.BackspaceDefault = false;
            }
            if (inputAfter.length > 0) {
                this.BackspaceDefault = true;
            }
        }, 0);
    }

    /**
     * Sets up NAR category filter events
     * @private
     */
    setupNarFilterEvents() {
        this.narFilter.addEventListener('change', () => {
            const selectedCategory = this.narFilter.value;
            console.log(`[Filter] NAR category changed to: ${selectedCategory}`);
            this.filterByNar();
            this.search(); // Reapply search after filtering
        });
    }

    /**
     * Sets up table column sorting events
     * @private
     */
    setupSortingEvents() {
        const headers = this.tableBody.querySelectorAll('th');
        headers.forEach((header, index) => {
            const columnKey = Object.keys(this.columns)[index];
            console.log(`[Sort] Setting up sort listener for column: ${columnKey}`);
            
            header.addEventListener('click', () => {
                console.log(`[Sort] Sorting by ${columnKey}`);
                this.sortTable(index);
            });
        });
    }

    /**
     * Performs the search operation based on current input and filters
     * @public
     */
    search() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const selectedCategory = this.narFilter.value.toLowerCase();
        console.log(`[Search] Term="${searchTerm}", Category="${selectedCategory}"`);

        let matchCount = 0;
        const rows = this.tableBody.querySelectorAll('tr');
        
        rows.forEach(row => {
            const narValue = row.getAttribute('data-nar');
            
            // Category filtering
            const matchesCategory = selectedCategory === "all" || 
                                  (narValue && narValue.includes(selectedCategory));
            
            // Search term filtering
            const matchesSearch = Array.from(row.getElementsByTagName('td'))
                .some(cell => cell.textContent.toLowerCase().includes(searchTerm));

            // Combined visibility check
            const isVisible = matchesCategory && matchesSearch;
            row.style.display = isVisible ? '' : 'none';
            
            if (isVisible) matchCount++;
        });

        console.log(`[Search] Found ${matchCount} matches`);
        this.updateSearchResults(searchTerm, matchCount);
    }

    /**
     * Sorts the table by specified column
     * @param {number} columnIndex - The index of the column to sort by
     * @public
     */
    sortTable(columnIndex) {
        const columnKey = Object.keys(this.columns)[columnIndex];
        console.log(`[Sort] Sorting by ${columnKey}`);

        // Toggle sort direction if same column
        if (this.currentSortColumn === columnIndex) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSortColumn = columnIndex;
            this.sortDirection = 'asc';
        }

        const rows = Array.from(this.tableBody.querySelectorAll('tr'));
        const columnType = this.columns[columnKey].type;

        rows.sort((a, b) => {
            const aValue = a.querySelectorAll('td')[columnIndex]?.textContent.trim() || '';
            const bValue = b.querySelectorAll('td')[columnIndex]?.textContent.trim() || '';

            let comparison = 0;
            if (columnType === 'number') {
                const aNum = parseFloat(aValue.replace(/,/g, '')) || 0;
                const bNum = parseFloat(bValue.replace(/,/g, '')) || 0;
                comparison = aNum - bNum;
            } else {
                comparison = aValue.localeCompare(bValue);
            }

            return this.sortDirection === 'asc' ? comparison : -comparison;
        });

        // Update table with sorted rows
        this.tableBody.innerHTML = '';
        rows.forEach(row => this.tableBody.appendChild(row));
        
        console.log(`[Sort] Table sorted ${this.sortDirection} by ${columnKey}`);
        this.updateSortIndicators(columnIndex);
    }

    /**
     * Updates visual indicators for sort state
     * @param {number} columnIndex - The index of the sorted column
     * @private
     */
    updateSortIndicators(columnIndex) {
        const headers = this.tableBody.querySelectorAll('th');
        headers.forEach((header, index) => {
            header.classList.remove('sort-asc', 'sort-desc');
            if (index === columnIndex) {
                header.classList.add(`sort-${this.sortDirection}`);
            }
        });
    }

    /**
     * Resets the table to its initial state
     * @public
     */
    resetTable() {
        console.log('[Table] Resetting table state');
        this.searchInput.value = '';
        this.narFilter.value = 'all';
        this.tableContainer.style.display = 'none';
        this.emptyState.style.display = 'block';
        this.resultContainer.style.display = 'none';
        
        const rows = this.tableBody.querySelectorAll('tr');
        rows.forEach(row => row.style.display = '');
        
        console.log('[Table] Table reset complete');
    }
}

// Initialize the handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Init] DOM loaded, initializing XMLTableHandler');
    const handler = new XMLTableHandler();
    handler.fetchXMLData()
        .then(() => {
            console.log('[Init] XML data loaded successfully');
            handler.resetTable();
        })
        .catch(error => {
            console.error('[Init] Failed to load XML data:', error);
        });
});

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/accounts.office.cheque.inquiry/service-worker.js', {
            scope: '/accounts.office.cheque.inquiry/'
        })
        .then(registration => {
            console.log('[ServiceWorker] Registered successfully:', registration.scope);
        })
        .catch(error => {
            console.error('[ServiceWorker] Registration failed:', error);
        });
    });
}
