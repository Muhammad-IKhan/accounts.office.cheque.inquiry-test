class XMLTableHandler {
    constructor() {
        console.log('Initializing XMLTableHandler...');
        
        try {
            this.initializeDOMElements();
            this.defineColumns();
            this.initializeState();
            this.initializeEventListeners();
            console.log('XMLTableHandler initialization successful');
        } catch (error) {
            console.error('Constructor Error:', error);
            this.showError('Failed to initialize table handler');
        }
    }

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

    initializeState() {
        this.enableLiveUpdate = false;
        this.tableResetEnabled = true;
        this.BackspaceDefault = true;
        this.xmlData = '';
        this.lastSearchTerm = '';
        this.lastFilterCategory = 'all';
        console.log('State variables initialized');
    }

    initializeEventListeners() {
        console.log('Setting up event listeners...');

        try {
            this.setupSearchListeners();
            this.setupNarFilterListeners();
            this.setupSorting();
            console.log('Event listeners setup complete');
        } catch (error) {
            console.error('Error in event listener setup:', error);
            this.showError('Failed to initialize event handlers');
        }
    }

    setupSorting() {
        const tableHeaders = document.querySelectorAll('#chequeTable th[data-column]');
        tableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.getAttribute('data-column');
                const isAscending = header.classList.toggle('asc');
                this.sortTable(column, isAscending);
            });
        });
    }

    sortTable(column, isAscending) {
        const rows = Array.from(this.tableBody.querySelectorAll('tr'));
        const columnIndex = this.columns[column].index;

        rows.sort((rowA, rowB) => {
            const cellA = rowA.querySelectorAll('td')[columnIndex].textContent.trim();
            const cellB = rowB.querySelectorAll('td')[columnIndex].textContent.trim();

            if (this.columns[column].type === 'number') {
                return isAscending ? parseFloat(cellA) - parseFloat(cellB) : parseFloat(cellB) - parseFloat(cellA);
            } else {
                return isAscending ? cellA.localeCompare(cellB) : cellB.localeCompare(cellA);
            }
        });

        this.tableBody.innerHTML = '';
        rows.forEach(row => this.tableBody.appendChild(row));

        console.log(`Table sorted by ${column} in ${isAscending ? 'ascending' : 'descending'} order`);
    }

    applyStatusStyles(cell, value) {
        console.log(`Applying status styles for value: ${value}`);
        const ddValue = value.toLowerCase();
        console.log(`Lowercase value: ${ddValue}`);

        const statusMap = {
            'despatched through gpo': 'status-orange',
            'ready but not signed yet': 'status-green',
            'cheque ready': 'status-green',
            'despatched to lakki camp office': 'status-red',
            'sent to chairman sb. for sign': 'status-blue'
        };

        cell.classList.remove('status-orange', 'status-green', 'status-red', 'status-blue', 'status-gray');

        let statusApplied = false;
        for (const [key, className] of Object.entries(statusMap)) {
            if (ddValue.includes(key)) {
                console.log(`Matched key: ${key}, applying class: ${className}`);
                cell.classList.add(className);
                statusApplied = true;
                break;
            }
        }

        if (!statusApplied) {
            console.log('No match found, applying default gray status');
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
