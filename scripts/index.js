/**
 * XMLTableHandler: Enhanced class for XML data handling and table management
 * Version: 3.0
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
            
            // Initialize event listeners
            this.initializeEventListeners();
            
            console.log('XMLTableHandler initialization successful');
        } catch (error) {
            console.error('Constructor Error:', error);
            this.showError('Failed to initialize table handler');
        }
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
            'statusFilter': 'statusFilter',
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
        this.rowsPerPage = 10; // Rows per page for pagination
        this.currentPage = 1; // Current page for pagination
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
            
            // Status filter events
            this.setupStatusFilterListeners();
            
            // Sorting events
            this.setupSorting();
            
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

        // Search button click event
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                console.log('Search button clicked - triggering search');
                this.search();
            });
        } else {
            console.warn('Search button not found');
        }
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
     * Set up status filter event listeners
     */
    setupStatusFilterListeners() {
        if (this.statusFilter) {
            this.statusFilter.addEventListener('change', () => {
                console.log('Status filter changed:', this.statusFilter.value);
                this.filterByStatus();
            });
        } else {
            console.warn('Status filter element not found');
        }
    }

    /**
     * Set up sorting functionality for table columns
     */
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

    /**
     * Sort the table by a specific column
     * @param {string} column - The column to sort by
     * @param {boolean} isAscending - Whether to sort in ascending order
     */
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
     * Filter by status
     */
    filterByStatus() {
        const selectedStatus = this.statusFilter.value.toLowerCase();
        console.log('Filtering by status:', selectedStatus);

        let matchCount = 0;
        this.tableBody.querySelectorAll('tr').forEach(row => {
            const statusCell = row.querySelector('td[data-field="DD"]');
            const statusValue = statusCell.textContent.toLowerCase();
            const visible = (selectedStatus === "all" || statusValue.includes(selectedStatus));
            row.style.display = visible ? '' : 'none';
            if (visible) matchCount++;
        });

        console.log(`Status filter complete: ${matchCount} rows visible`);
    }

    /**
     * Initialize pagination
     */
    initializePagination() {
        console.log('Initializing pagination...');

        // Add event listeners for pagination
        document.getElementById('prevPage').addEventListener('click', () => this.prevPage());
        document.getElementById('nextPage').addEventListener('click', () => this.nextPage());

        // Render the initial page
        this.renderPage(this.currentPage);
    }

    /**
     * Render a specific page
     * @param {number} page - The page number to render
     */
    renderPage(page) {
        console.log(`Rendering page ${page}...`);

        const rows = this.tableBody.querySelectorAll('tr');
        const startIndex = (page - 1) * this.rowsPerPage;
        const endIndex = startIndex + this.rowsPerPage;

        rows.forEach((row, index) => {
            if (index >= startIndex && index < endIndex) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });

        // Update pagination controls
        this.updatePaginationControls(page);
    }

    /**
     * Update pagination controls
     * @param {number} page - The current page number
     */
    updatePaginationControls(page) {
        const totalRows = this.tableBody.querySelectorAll('tr').length;
        const totalPages = Math.ceil(totalRows / this.rowsPerPage);

        console.log(`Updating pagination controls for page ${page} of ${totalPages}...`);

        // Update previous/next buttons
        document.getElementById('prevPage').classList.toggle('disabled', page === 1);
        document.getElementById('nextPage').classList.toggle('disabled', page === totalPages);

        // Update page numbers
        const pagination = document.querySelector('.pagination');
        pagination.innerHTML = `
            <li class="page-item ${page === 1 ? 'disabled' : ''}" id="prevPage">
                <a class="page-link" href="#">Previous</a>
            </li>
        `;

        for (let i = 1; i <= totalPages; i++) {
            pagination.innerHTML += `
                <li class="page-item ${i === page ? 'active' : ''}">
                    <a class="page-link" href="#">${i}</a>
                </li>
            `;
        }

        pagination.innerHTML += `
            <li class="page-item ${page === totalPages ? 'disabled' : ''}" id="nextPage">
                <a class="page-link" href="#">Next</a>
            </li>
        `;

        // Add event listeners to page numbers
        document.querySelectorAll('.pagination .page-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                if (index === 0) {
                    this.prevPage();
                } else if (index === totalPages + 1) {
                    this.nextPage();
                } else {
                    this.renderPage(index);
                }
            });
        });
    }

    /**
     * Go to the previous page
     */
    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderPage(this.currentPage);
        }
    }

    /**
     * Go to the next page
     */
    nextPage() {
        const totalRows = this.tableBody.querySelectorAll('tr').length;
        const totalPages = Math.ceil(totalRows / this.rowsPerPage);

        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderPage(this.currentPage);
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
     * Reset table to initial state
     */
    resetTable() {
        console.log('Resetting table to initial state');
        
        this.searchInput.value = '';
        if (this.narFilter) {
            this.narFilter.value = 'all';
        }
        if (this.statusFilter) {
            this.statusFilter.value = 'all';
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
