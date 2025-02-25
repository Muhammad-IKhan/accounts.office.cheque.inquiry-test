class XMLTableHandler {
    /**
     * Initialize the XML Table Handler with all necessary components.
     * Handles XML data loading, parsing, filtering, sorting, and pagination.
     */
    constructor() {
        // Configuration object for default settings
        this.config = {
            maxPagesToShow: 5, // Maximum number of pages to show in pagination
            rowsPerPage: 10, // Default rows per page
            minSearchChars: 3, // Minimum characters required for search
            enableCaching: true, // Enable caching of XML data
            debugMode: true // Enable detailed logging for debugging
        };

        console.log('🚀 Initializing XMLTableHandler...');
        try {
            // Initialize all components
            this.defineColumns();
            this.initializeDOMElements();
            this.initializeState();
            this.initializeEventListeners();

            // Fetch and display data
            this.fetchXMLData()
                .then(() => {
                    this.resetTable();
                    console.log('✅ Initial data load complete');
                })
                .catch((error) => {
                    console.error('❌ Initial data load failed:', error);
                    this.showError('Failed to load initial data: ' + error.message);
                });
        } catch (error) {
            console.error('❌ Constructor Error:', error.message);
            this.showError('Failed to initialize table handler: ' + error.message);
        }
    }

    /**
     * Define table columns configuration.
     * Each column has its index, data type, display title, and search properties.
     */
    defineColumns() {
        console.log('📊 Defining table columns...');
        this.columns = {
            NARRATION: { index: 0, type: 'string', required: true, title: 'Narration', searchable: true },
            AMOUNT: { index: 1, type: 'number', required: true, title: 'Amount', searchable: false },
            CHEQ_NO: { index: 2, type: 'number', required: true, title: 'Cheque No', searchable: false },
            NAR: { index: 3, type: 'string', required: true, title: 'NAR', searchable: false },
            DD: { index: 4, type: 'string', required: true, title: 'Status', searchable: false }
        };
    }

    /**
     * Initialize all required DOM elements.
     */
    initializeDOMElements() {
        console.log('🔍 Finding DOM elements...');

        // Essential elements that must exist
        const essentialElements = {
            checksTable: 'tableBody',
            tableContainer: 'tableContainer',
            emptyState: 'emptyState',
            result: 'resultContainer',
            search: 'searchInput',
            narCategory: 'narFilter',
            statusFilter: 'statusFilter',
            pagination: 'paginationContainer',
            searchBtn: 'searchBtn',
            rowsPerPage: 'rowsPerPageSelect'
        };

        // Check essential elements
        for (const [id, prop] of Object.entries(essentialElements)) {
            const element = document.getElementById(id);
            if (!element) {
                throw new Error(`Required element #${id} not found in DOM`);
            }
            this[prop] = element;
            console.log(`✓ Found essential element #${id}`);
        }
    }

    /**
     * Initialize application state with default values.
     */
    initializeState() {
        console.log('🏁 Initializing application state...');
        this.state = {
            enableLiveUpdate: false,
            xmlData: '',
            lastSearchTerm: '',
            currentStatusFilter: 'all',
            lastFilterCategory: 'all',
            paginationEnabled: true,
            rowsPerPage: this.config.rowsPerPage,
            currentPage: 1,
            visibleRowsCount: 0,
            sortColumn: null,
            sortDirection: 'asc'
        };
    }

    /**
     * Setup all event listeners for search, filter, pagination, and sorting.
     */
    initializeEventListeners() {
        console.log('👂 Setting up event listeners...');

        // Search events
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });
        this.searchBtn.addEventListener('click', () => this.performSearch());

        // Filter events
        this.narFilter.addEventListener('change', () => this.applyFilters());
        this.statusFilter.addEventListener('change', () => this.applyFilters());

        // Pagination events
        this.rowsPerPageSelect.addEventListener('change', () => {
            this.state.rowsPerPage = parseInt(this.rowsPerPageSelect.value);
            this.state.currentPage = 1;
            this.updatePagination();
        });

        // Sorting events
        document.querySelectorAll('th[data-column]').forEach(header => {
            header.addEventListener('click', () => this.sortTable(header.dataset.column));
        });

        console.log('✅ Event listeners initialized');
    }

    /**
     * Fetch XML data from server or cache.
     * @returns {Promise<boolean>} - True if data was successfully processed
     */
    async fetchXMLData() {
        console.log('📥 Fetching XML data...');
        try {
            const filesResponse = await fetch('https://muhammad-ikhan.github.io/accounts.office.cheque.inquiry/public/data/files.json');
            if (!filesResponse.ok) throw new Error(`HTTP error! Status: ${filesResponse.status}`);
            const xmlFiles = await filesResponse.json();
            console.log(`📄 Found ${xmlFiles.length} XML files to process`);

            let combinedXML = '<root>';
            for (const file of xmlFiles) {
                console.log(`🔄 Processing file: ${file}`);
                const fileResponse = await fetch(`/data/${file}`);
                if (!fileResponse.ok) throw new Error(`HTTP error for file: ${file}`);
                let xmlContent = await fileResponse.text();
                xmlContent = xmlContent.replace(/<\?xml[^>]+\?>/, '').replace(/<\/?root>/g, '');
                combinedXML += xmlContent;
            }
            combinedXML += '</root>';

            console.log('💾 Saving combined XML to local storage');
            localStorage.setItem('xmlData', combinedXML);
            this.state.xmlData = combinedXML;

            const result = this.parseXMLToTable(combinedXML);
            this.initializePagination();
            return result;
        } catch (error) {
            console.error('❌ Error fetching XML:', error);
            const storedXML = localStorage.getItem('xmlData');
            if (storedXML) {
                console.log('📋 Using cached XML data from local storage');
                this.state.xmlData = storedXML;
                const result = this.parseXMLToTable(storedXML);
                this.initializePagination();
                return result;
            }
            throw error;
        }
    }

    /**
     * Parse XML string into table rows.
     * @param {string} xmlString - XML data to parse
     * @returns {boolean} - True if parsing was successful
     */
    parseXMLToTable(xmlString) {
        console.log('🔄 Parsing XML data to table...');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");

        if (xmlDoc.querySelector('parsererror')) {
            const error = xmlDoc.querySelector('parsererror').textContent;
            console.error('❌ XML parsing error:', error);
            throw new Error('XML parsing error: ' + error);
        }

        const entries = xmlDoc.getElementsByTagName('G_PVN');
        console.log(`📊 Found ${entries.length} entries to display`);
        this.tableBody.innerHTML = '';

        Array.from(entries).forEach((element, index) => {
            const row = this.createTableRow(element);
            this.tableBody.appendChild(row);
            if (index === 0 || index === entries.length - 1 || index % 100 === 0) {
                console.log(`📝 Processed ${index + 1}/${entries.length} rows`);
            }
        });

        this.state.visibleRowsCount = entries.length;
        console.log('✅ XML parsing complete');
        return true;
    }

    /**
     * Create a table row from XML element.
     * @param {Element} element - XML element to convert to row
     * @returns {HTMLTableRowElement} - The created table row
     */
    createTableRow(element) {
        const row = document.createElement('tr');
        const narValue = element.getElementsByTagName('NAR')[0]?.textContent?.trim() || '';
        row.setAttribute('data-nar', narValue.toLowerCase());

        Object.entries(this.columns).forEach(([field, config]) => {
            const cell = document.createElement('td');
            let value = element.getElementsByTagName(field)[0]?.textContent?.trim() || '';

            if (config.type === 'number' && field === 'AMOUNT') {
                value = this.formatAmount(value);
            }

            cell.textContent = value;
            cell.setAttribute('data-field', field);

            if (field === 'DD') {
                cell.className = this.getStatusColor(value);
            }

            row.appendChild(cell);
        });

        return row;
    }

    /**
     * Format amount as locale string.
     * @param {string} value - Amount value to format
     * @returns {string} - Formatted amount
     */
    formatAmount(value) {
        try {
            return parseFloat(value).toLocaleString('en-US');
        } catch (error) {
            console.warn(`⚠️ Invalid amount value: ${value}`, error);
            return '0';
        }
    }

    /**
     * Get CSS class name for status color.
     * @param {string} status - Status text
     * @returns {string} - CSS class name for color
     */
    getStatusColor(status) {
        const statusMap = {
            'despatched through gpo': 'status-orange',
            'ready but not signed yet': 'status-green',
            'cheque ready': 'status-green',
            'despatched to lakki camp office': 'status-red',
            'sent to chairman': 'status-blue',
            'expired': 'status-purple',
            'cancelled': 'status-dark-red',
            'rejected': 'status-dark-red',
            'on hold': 'status-yellow',
            'processing': 'status-cyan'
        };

        const lowerStatus = status.toLowerCase();
        const colorClass = Object.entries(statusMap).find(([key]) => lowerStatus.includes(key))?.[1] || 'status-gray';
        return colorClass;
    }

    /**
     * Perform search using input value.
     */
    performSearch() {
        const searchTerm = this.searchInput.value.trim().toLowerCase();
        if (searchTerm.length > 0 && searchTerm.length < this.config.minSearchChars) {
            this.showError(`Search term must be at least ${this.config.minSearchChars} characters.`);
            console.log(`🔎 Search rejected, term too short: "${searchTerm}" (${searchTerm.length}/${this.config.minSearchChars})`);
            return;
        }

        console.log(`🔎 Performing search for: "${searchTerm}"`);
        this.state.lastSearchTerm = searchTerm;
        this.state.currentPage = 1;
        this.applyFilters();
    }

    /**
     * Apply all filters (search, category, status).
     */
    applyFilters() {
        console.log('🔍 Applying filters...');
        const searchTerm = this.state.lastSearchTerm;
        const narCategory = this.narFilter.value.toLowerCase();
        const statusFilter = this.statusFilter.value.toLowerCase();

        console.log(`🔍 Filter criteria: search="${searchTerm}", category="${narCategory}", status="${statusFilter}"`);

        // Reset if no filters are applied
        if (!searchTerm && narCategory === 'all' && statusFilter === 'all') {
            console.log('🔄 No filters active, resetting table');
            return this.resetTable();
        }

        // Show table and hide empty state
        this.tableContainer.style.display = 'block';
        this.emptyState.style.display = 'none';
        this.resultContainer.style.display = 'block';

        let matchCount = 0;

        // Apply filters to all rows
        const allRows = Array.from(this.tableBody.querySelectorAll('tr'));
        allRows.forEach(row => {
            const narValue = row.getAttribute('data-nar');
            const status = row.querySelector('td[data-field="DD"]')?.textContent?.toLowerCase() || '';
            const cells = Array.from(row.getElementsByTagName('td'));

            // Check category match
            const matchesCategory = narCategory === 'all' || narValue === narCategory;
            // Check status match
            const matchesStatus = statusFilter === 'all' || status.includes(statusFilter);
            // Check search term match
            const matchesSearch = !searchTerm || cells.some(cell => {
                const field = cell.getAttribute('data-field');
                const columnConfig = this.columns[field];
                return columnConfig?.searchable && cell.textContent.toLowerCase().includes(searchTerm);
            });

            // Determine visibility based on filter criteria
            const visible = matchesCategory && matchesStatus && matchesSearch;
            row.style.display = visible ? '' : 'none';
            if (visible) matchCount++;
        });

        console.log(`🔍 Filter found ${matchCount} matching rows`);
        this.updateSearchResults(matchCount);

        // After filtering, reset pagination state and update
        this.state.visibleRowsCount = matchCount;
        this.updatePagination();
    }

    /**
     * Update search results message.
     * @param {number} matchCount - Number of matching rows
     */
    updateSearchResults(matchCount) {
        const searchTerm = this.state.lastSearchTerm;
        const narCategory = this.narFilter.value.toLowerCase();
        const statusFilter = this.statusFilter.value.toLowerCase();
        const narCategoryText = this.narFilter.options[this.narFilter.selectedIndex].text;

        let message = `Found ${matchCount} results`;
        if (searchTerm) message += ` for "${searchTerm}"`;
        if (narCategory !== 'all') message += ` in category "${narCategoryText}"`;
        if (statusFilter !== 'all') message += ` with status "${statusFilter}"`;

        console.log(`📊 Search results: ${message}`);
        this.resultContainer.textContent = matchCount > 0 ? message : 'No results found.';
    }

    /**
     * Reset table to initial state.
     */
    resetTable() {
        console.log('🔄 Resetting table to initial state');
        this.searchInput.value = '';
        this.narFilter.value = 'all';
        this.statusFilter.value = 'all';

        this.state.lastSearchTerm = '';
        this.state.currentPage = 1;

        // Make all rows visible
        this.tableBody.querySelectorAll('tr').forEach(row => {
            row.style.display = '';
        });

        // Update visibility and pagination
        this.state.visibleRowsCount = this.tableBody.querySelectorAll('tr').length;
        if (this.state.visibleRowsCount === 0) {
            this.tableContainer.style.display = 'none';
            this.emptyState.style.display = 'block';
            this.resultContainer.style.display = 'none';
        } else {
            this.tableContainer.style.display = 'block';
            this.emptyState.style.display = 'none';
            this.resultContainer.style.display = 'block';
        }

        this.updatePagination();
    }

    /**
     * Show error message to the user.
     * @param {string} message - Error message to display
     */
    showError(message) {
        console.error('❌ Error:', message);
        this.resultContainer.innerHTML = `
            <div class="alert alert-danger">
                ${message}
            </div>
        `;
        this.resultContainer.style.display = 'block';
    }

    /**
     * Sort table by column.
     * @param {string} column - Column name to sort by
     */
    sortTable(column) {
        if (!this.columns[column]) {
            console.warn(`⚠️ Cannot sort by unknown column: ${column}`);
            return;
        }

        const direction = this.state.sortColumn === column && this.state.sortDirection === 'asc' ? 'desc' : 'asc';
        const type = this.columns[column].type;

        console.log(`🔃 Sorting by ${column} (${type}) in ${direction} order`);

        const rows = Array.from(this.tableBody.getElementsByTagName('tr'));
        rows.sort((a, b) => {
            const aValue = this.getCellValue(a, column, type);
            const bValue = this.getCellValue(b, column, type);

            return direction === 'asc' ?
                aValue > bValue ? 1 : -1 :
                aValue < bValue ? 1 : -1;
        });

        this.updateSortIndicators(column, direction);
        this.reorderRows(rows);

        this.state.sortColumn = column;
        this.state.sortDirection = direction;
        console.log('✅ Sorting complete');
    }

    /**
     * Get cell value for sorting.
     * @param {HTMLTableRowElement} row - Table row
     * @param {string} column - Column name
     * @param {string} type - Data type
     * @returns {string|number} - Cell value
     */
    getCellValue(row, column, type) {
        const cell = row.querySelector(`td[data-field="${column}"]`);
        if (!cell) {
            console.warn(`⚠️ Cell not found for field ${column}`);
            return type === 'number' ? 0 : '';
        }

        const value = cell.textContent.trim();
        if (type === 'number') {
            return parseFloat(value.replace(/,/g, '')) || 0;
        }

        return value.toLowerCase();
    }

    /**
     * Update sort indicators in table headers.
     * @param {string} column - Column being sorted
     * @param {string} direction - Sort direction
     */
    updateSortIndicators(column, direction) {
        const sortIcons = document.querySelectorAll('th[data-column] .sort-icon');
        if (sortIcons.length > 0) {
            sortIcons.forEach(icon => {
                icon.textContent = '';
            });
        }

        const currentHeader = document.querySelector(`th[data-column="${column}"]`);
        if (currentHeader) {
            let sortIcon = currentHeader.querySelector('.sort-icon');
            if (!sortIcon) {
                sortIcon = document.createElement('span');
                sortIcon.className = 'sort-icon';
                currentHeader.appendChild(sortIcon);
            }
            sortIcon.textContent = direction === 'asc' ? ' ↑' : ' ↓';
        }
    }

    /**
     * Reorder table rows after sorting.
     * @param {Array<HTMLTableRowElement>} rows - Sorted rows
     */
    reorderRows(rows) {
        this.tableBody.innerHTML = '';
        rows.forEach(row => this.tableBody.appendChild(row));
        console.log(`🔄 Reordered ${rows.length} rows in table`);
    }

    /**
     * Initialize pagination controls.
     */
    initializePagination() {
        if (!this.paginationContainer) {
            console.log('⚠️ Pagination container is missing, disabling pagination');
            this.state.paginationEnabled = false;
            return;
        }

        console.log('🔢 Initializing pagination controls...');
        this.updatePagination();
    }

    /**
     * Update pagination based on current page and rows per page.
     */
    updatePagination() {
        if (!this.state.paginationEnabled || !this.paginationContainer) {
            console.log('⏩ Pagination is disabled or container missing, skipping update');
            return;
        }

        console.log(`📄 Updating pagination for page ${this.state.currentPage}`);

        // Get all visible rows
        const visibleRows = Array.from(this.tableBody.querySelectorAll('tr'))
            .filter(row => row.style.display !== 'none');

        this.state.visibleRowsCount = visibleRows.length;
        console.log(`👁️ Found ${this.state.visibleRowsCount} visible rows`);

        // Calculate total pages
        const totalPages = Math.max(1, Math.ceil(this.state.visibleRowsCount / this.state.rowsPerPage));

        // Ensure current page is valid
        if (totalPages > 0) {
            this.state.currentPage = Math.min(Math.max(1, this.state.currentPage), totalPages);
        } else {
            this.state.currentPage = 1;
        }

        console.log(`📚 Total pages: ${totalPages}, Current page: ${this.state.currentPage}`);

        // Calculate start and end indices for current page
        const startIndex = (this.state.currentPage - 1) * this.state.rowsPerPage;
        const endIndex = startIndex + this.state.rowsPerPage;

        // Update row visibility based on current page
        visibleRows.forEach((row, index) => {
            row.style.display = (index >= startIndex && index < endIndex) ? '' : 'none';
        });

        // Render pagination controls
        this.renderPaginationControls(totalPages);
    }

    /**
     * Render pagination control buttons.
     * @param {number} totalPages - Total number of pages
     */
    renderPaginationControls(totalPages) {
        if (!this.paginationContainer) return;

        // Clear existing controls
        this.paginationContainer.innerHTML = '';

        // If there's only one page or no pages, hide controls
        if (totalPages <= 1) {
            this.paginationContainer.style.display = 'none';
            console.log('🔢 Hiding pagination controls (single page)');
            return;
        }

        // Always show pagination controls when there are multiple pages
        this.paginationContainer.style.display = 'flex';
        console.log('🔢 Rendering pagination controls for', totalPages, 'pages');

        // Previous Button
        this.createPaginationButton('Previous', () => {
            if (this.state.currentPage > 1) {
                this.state.currentPage--;
                console.log(`⬅️ Moving to previous page: ${this.state.currentPage}`);
                this.updatePagination();
            }
        }, this.state.currentPage === 1);

        // Page buttons with ellipsis
        const pages = this.getPageNumbers(this.state.currentPage, totalPages);
        pages.forEach(page => {
            if (page === '...') {
                const span = document.createElement('span');
                span.className = 'page-ellipsis';
                span.textContent = '...';
                this.paginationContainer.appendChild(span);
            } else {
                this.createPaginationButton(page, () => {
                    this.state.currentPage = page;
                    console.log(`📄 Moving to page: ${page}`);
                    this.updatePagination();
                }, false, this.state.currentPage === page);
            }
        });

        // Next Button
        this.createPaginationButton('Next', () => {
            if (this.state.currentPage < totalPages) {
                this.state.currentPage++;
                console.log(`➡️ Moving to next page: ${this.state.currentPage}`);
                this.updatePagination();
            }
        }, this.state.currentPage === totalPages);
    }

    /**
     * Get page numbers for pagination with ellipsis.
     * @param {number} currentPage - Current page number
     * @param {number} totalPages - Total number of pages
     * @returns {Array<number|string>} - Array of page numbers with ellipsis
     */
    getPageNumbers(currentPage, totalPages) {
        const maxPagesToShow = this.config.maxPagesToShow;

        if (totalPages <= maxPagesToShow) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        if (currentPage <= Math.ceil(maxPagesToShow / 2)) {
            return [...Array.from({ length: maxPagesToShow - 1 }, (_, i) => i + 1), '...', totalPages];
        }

        if (currentPage >= totalPages - Math.floor(maxPagesToShow / 2)) {
            return [1, '...', ...Array.from({ length: maxPagesToShow - 1 }, (_, i) => totalPages - (maxPagesToShow - 2) + i)];
        }

        return [1, '...', ...Array.from({ length: maxPagesToShow - 2 }, (_, i) => currentPage - Math.floor((maxPagesToShow - 3) / 2) + i), '...', totalPages];
    }

    /**
     * Create a pagination button with appropriate handlers.
     * @param {string} text - Button text
     * @param {Function} onClick - Click handler
     * @param {boolean} disabled - Whether button should be disabled
     * @param {boolean} active - Whether button should be marked as active
     */
    createPaginationButton(text, onClick, disabled = false, active = false) {
        if (!this.paginationContainer) return null;

        const button = document.createElement('button');
        button.className = `page-btn${disabled ? ' disabled' : ''}${active ? ' active' : ''}`;
        button.textContent = text;
        button.disabled = disabled;
        button.addEventListener('click', onClick);
        this.paginationContainer.appendChild(button);
        return button;
    }
}

// Initialize handler when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌐 Document loaded, initializing XMLTableHandler...');
    try {
        window.tableHandler = new XMLTableHandler();
        console.log('✅ XMLTableHandler successfully initialized');
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger mt-3';
        errorDiv.innerHTML = `Failed to initialize table handler: ${error.message}`;
        document.body.insertBefore(errorDiv, document.body.firstChild);
    }
});

// Register service worker for offline capabilities
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        console.log('🔄 Registering Service Worker...');
        navigator.serviceWorker
            .register('/')})
            .then((registration) => console.log('✅ ServiceWorker registered successfully, scope:', registration.scope))
            .catch((err) => console.error('❌ ServiceWorker registration failed:', err));
    });
}