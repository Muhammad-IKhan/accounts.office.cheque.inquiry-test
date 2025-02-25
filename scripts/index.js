class XMLTableHandler {
    /**
     * Initialize the XML Table Handler with all necessary components
     * This handles XML data loading, parsing, filtering, sorting and pagination
     */
    constructor() {
        console.log('🚀 Initializing XMLTableHandler...');
        try {
            this.defineColumns();
            this.initializeDOMElements();
            this.initializeState();
            this.initializeEventListeners();

            // Fetch and display data
            this.fetchXMLData().then(() => {
                this.resetTable();
                console.log('✅ Initial data load complete');
            }).catch(error => {
                console.error('❌ Initial data load failed:', error);
                this.showError('Failed to load initial data: ' + error.message);
            });
        } catch (error) {
            console.error('❌ Constructor Error:', error.message);
            this.showError('Failed to initialize table handler: ' + error.message);
        }
    }

    /**
     * Define table columns configuration
     * Each column has its index, data type, display title, and search properties
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
     * Initialize all required DOM elements
     * Creates missing pagination elements if needed
     * Falls back gracefully for non-critical elements
     */
    initializeDOMElements() {
        console.log('🔍 Finding DOM elements...');
        
        // Essential elements that must exist
        const essentialElements = {
            'checksTable': 'tableBody',
            'tableContainer': 'tableContainer',
            'emptyState': 'emptyState',
            'result': 'resultContainer'
        };

        // Optional elements that can be created if missing
        const optionalElements = {
            'search': 'searchInput',
            'narCategory': 'narFilter',
            'statusFilter': 'statusFilter',
            'pagination': 'paginationContainer',
            'searchBtn': 'searchBtn',
            'rowsPerPage': 'rowsPerPageSelect'
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

        // Check optional elements and create if missing
        for (const [id, prop] of Object.entries(optionalElements)) {
            let element = document.getElementById(id);
            
            if (!element) {
                console.warn(`Press Ctrl+Shiof+R ⚠️ Element #${id} not found in DOM. Creating fallback.`);
                element = this.createFallbackElement(id);
                this[prop] = element;
            } else {
                this[prop] = element;
                console.log(`✓ Found optional element #${id}`);
            }
        }
    }

    /**
     * Create fallback elements for missing DOM elements
     * @param {string} id - ID of the missing element
     * @returns {HTMLElement} - Created fallback element
     */
    createFallbackElement(id) {
        const container = document.createElement('div');
        container.id = id + '_fallback';
        
        switch (id) {
            case 'pagination':
                container.className = 'pagination-container';
                // Append to result container or table container
                if (this.resultContainer) {
                    this.resultContainer.after(container);
                } else if (this.tableContainer) {
                    this.tableContainer.after(container);
                } else {
                    document.body.appendChild(container);
                }
                console.log('📄 Created fallback pagination container');
                break;
                
            case 'search':
                container.innerHTML = `<input type="text" placeholder="Search..." class="form-control" />`;
                this.tableContainer.before(container);
                console.log('🔍 Created fallback search input');
                return container.querySelector('input');
                
            case 'searchBtn':
                container.innerHTML = `<button class="btn btn-primary">Search</button>`;
                // Try to append next to search input if it exists
                const searchInput = document.getElementById('search');
                if (searchInput) {
                    searchInput.after(container);
                } else {
                    this.tableContainer.before(container);
                }
                console.log('🔍 Created fallback search button');
                return container.querySelector('button');
                
            case 'narCategory':
                container.innerHTML = `<select class="form-control"><option value="all">All Categories</option></select>`;
                this.tableContainer.before(container);
                console.log('📋 Created fallback NAR filter');
                return container.querySelector('select');
                
            case 'statusFilter':
                container.innerHTML = `<select class="form-control"><option value="all">All Statuses</option></select>`;
                this.tableContainer.before(container);
                console.log('📋 Created fallback status filter');
                return container.querySelector('select');
                
            case 'rowsPerPage':
                container.innerHTML = `
                    <select class="form-control">
                        <option value="10">10 per page</option>
                        <option value="25">25 per page</option>
                        <option value="50">50 per page</option>
                        <option value="100">100 per page</option>
                    </select>
                `;
                // Try to append near pagination if it exists
                const paginationContainer = document.getElementById('pagination');
                if (paginationContainer) {
                    paginationContainer.before(container);
                } else {
                    this.tableContainer.after(container);
                }
                console.log('📄 Created fallback rows per page selector');
                return container.querySelector('select');
                
            default:
                console.log(`⚠️ No fallback created for #${id}`);
                return container;
        }
        
        return container;
    }

    /**
     * Initialize application state with default values
     */
    initializeState() {
        console.log('🏁 Initializing application state...');
        this.state = {
            enableLiveUpdate: false,
            tableResetEnabled: true,
            backspaceDefault: true,
            xmlData: '',
            lastSearchTerm: '',
            currentStatusFilter: 'all',
            lastFilterCategory: 'all',
            paginationEnabled: true,
            rowsPerPage: 5,
            currentPage: 1,
            visibleRowsCount: 0,
            sortColumn: null,
            sortDirection: 'asc'
        };
    }

    /**
     * Setup all event listeners for search, filter, pagination and sorting
     * Checks if elements exist before attaching listeners
     */
    initializeEventListeners() {
        console.log('👂 Setting up event listeners...');
        
        // Search events - check if elements exist first
        if (this.searchInput) {
            this.searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    console.log('🔎 Search triggered by Enter key');
                    this.performSearch();
                }
                this.handleBackspace(e);
            });
            console.log('✓ Added search input listeners');
        }

        if (this.searchBtn) {
            this.searchBtn.addEventListener('click', () => {
                console.log('🔎 Search triggered by button click');
                this.performSearch();
            });
            console.log('✓ Added search button listener');
        }

        // Filter events - check if elements exist first
        if (this.narFilter) {
            this.narFilter.addEventListener('change', () => {
                console.log('🔄 NAR filter changed:', this.narFilter.value);
                this.applyFilters();
            });
            console.log('✓ Added NAR filter listener');
        }
        
        if (this.statusFilter) {
            this.statusFilter.addEventListener('change', () => {
                console.log('🔄 Status filter changed:', this.statusFilter.value);
                this.applyFilters();
            });
            console.log('✓ Added status filter listener');
        }

        // Rows per page change - check if element exists first
        if (this.rowsPerPageSelect) {
            this.rowsPerPageSelect.addEventListener('change', () => {
                const newValue = parseInt(this.rowsPerPageSelect.value);
                console.log(`📄 Rows per page changed to ${newValue}`);
                this.state.rowsPerPage = newValue;
                this.state.currentPage = 1; // Reset to first page
                this.updatePagination();
            });
            console.log('✓ Added rows per page listener');
        }

        // Sorting events - check if there are sortable columns
        const sortableHeaders = document.querySelectorAll('th[data-column]');
        if (sortableHeaders.length > 0) {
            sortableHeaders.forEach(header => {
                header.addEventListener('click', () => {
                    const column = header.dataset.column;
                    console.log(`🔃 Sort requested for column: ${column}`);
                    this.sortTable(column);
                });
            });
            console.log(`✓ Added sorting listeners to ${sortableHeaders.length} column headers`);
        } else {
            console.log('⚠️ No sortable column headers found');
        }
        
        console.log('✅ Event listener initialization complete');
    }

    /**
     * Handle backspace functionality in search input
     * Resets table when appropriate
     * Only runs if search input exists
     * @param {KeyboardEvent} e - The keyboard event
     */
    handleBackspace(e) {
        if (!this.searchInput) return;
        
        if (e.key === 'Backspace' && this.state.tableResetEnabled) {
            const inputBefore = this.searchInput.value.trim();
            
            setTimeout(() => {
                const inputAfter = this.searchInput.value.trim();
                if (this.state.backspaceDefault && inputBefore.length > 1) {
                    const caretPosition = this.searchInput.selectionStart;
                    this.resetTable();
                    this.searchInput.value = inputAfter;
                    this.searchInput.setSelectionRange(caretPosition, caretPosition);
                    this.state.backspaceDefault = false;
                    console.log('⌫ Backspace triggered table reset');
                }
                if (inputAfter.length > 0) {
                    this.state.backspaceDefault = true;
                }
            }, 0);
        }
    }

    /**
     * Initialize pagination controls
     * Only runs if pagination is enabled and container exists
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
 * Update pagination based on current page and rows per page
 * Handles visibility of rows and rendering pagination controls
 * Skips if pagination is disabled or container is missing
 */
/**
 * Update pagination based on current page and rows per page
 * Handles visibility of rows and rendering pagination controls
 * Skips if pagination is disabled or container is missing
 */
updatePagination() {
    if (!this.state.paginationEnabled || !this.paginationContainer) {
        console.log('⏩ Pagination is disabled or container missing, skipping update');
        return;
    }

    console.log(`📄 Updating pagination for page ${this.state.currentPage}`);
    
    // Store the current visible rows count before any modifications
    const visibleRows = Array.from(this.tableBody.querySelectorAll('tr'))
        .filter(row => row.style.display !== 'none');
    
    // Store this count in state for reference across methods
    this.state.visibleRowsCount = visibleRows.length;
    console.log(`👁️ Found ${this.state.visibleRowsCount} visible rows`);

    // Calculate total pages
    const totalPages = Math.ceil(this.state.visibleRowsCount / this.state.rowsPerPage);
    
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

    // Only update display of rows that passed the filter (are already visible)
    let visibleIndex = 0;
    this.tableBody.querySelectorAll('tr').forEach(row => {
        // Skip already hidden rows (filtered out)
        if (row.style.display === 'none') return;
        
        // Toggle visibility based on pagination
        row.style.display = (visibleIndex >= startIndex && visibleIndex < endIndex) ? '' : 'none';
        visibleIndex++;
    });

    // Always render pagination controls if we have filtered results
    this.renderPaginationControls(totalPages);
    
    // Store the pagination state in a session storage to preserve across page changes
    try {
        sessionStorage.setItem('paginationState', JSON.stringify({
            currentPage: this.state.currentPage,
            totalPages: totalPages,
            visibleRowsCount: this.state.visibleRowsCount,
            lastSearchTerm: this.state.lastSearchTerm,
            lastFilterCategory: this.state.lastFilterCategory,
            currentStatusFilter: this.state.currentStatusFilter
        }));
    } catch (e) {
        console.warn('Could not save pagination state', e);
    }
}

/**
 * Render pagination control buttons
 * Only runs if pagination container exists
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
    }, this.state.currentPage <= 1);

    // Page indicator
    const pageIndicator = document.createElement('span');
    pageIndicator.className = 'page-indicator';
    pageIndicator.textContent = `Page ${this.state.currentPage} of ${totalPages}`;
    this.paginationContainer.appendChild(pageIndicator);

    // Next Button
    this.createPaginationButton('Next', () => {
        if (this.state.currentPage < totalPages) {
            this.state.currentPage++;
            console.log(`➡️ Moving to next page: ${this.state.currentPage}`);
            // Important: only update pagination, don't reapply filters
            this.updatePagination();
        }
    }, this.state.currentPage >= totalPages);
}

    /**
     * Create a pagination button with appropriate handlers
     * @param {string} text - Button text
     * @param {Function} onClick - Click handler
     * @param {boolean} disabled - Whether button should be disabled
     */
    createPaginationButton(text, onClick, disabled = false) {
        if (!this.paginationContainer) return null;
        
        const button = document.createElement('button');
        button.className = `page-btn${disabled ? ' disabled' : ''}`;
        button.textContent = text;
        button.disabled = disabled;
        button.addEventListener('click', onClick);
        this.paginationContainer.appendChild(button);
        return button;
    }

    /**
     * Fetch XML data from server files or use cached data
     * @returns {Promise<boolean>} - True if data was successfully processed
     */
    async fetchXMLData() {
        console.log('📥 Fetching XML data...');
        try {
            const filesResponse = await fetch('/accounts.office.cheque.inquiry/public/data/files.json');
            if (!filesResponse.ok) throw new Error(`HTTP error! Status: ${filesResponse.status}`);
            const xmlFiles = await filesResponse.json();
            console.log(`📄 Found ${xmlFiles.length} XML files to process`);

            let combinedXML = '<root>';
            for (const file of xmlFiles) {
                console.log(`🔄 Processing file: ${file}`);
                const fileResponse = await fetch(`/accounts.office.cheque.inquiry/public/data/${file}`);
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
            this.initializePagination(); // Initialize pagination after parsing data
            return result;
        } catch (error) {
            console.error('❌ Error fetching XML:', error);
            const storedXML = localStorage.getItem('xmlData');
            if (storedXML) {
                console.log('📋 Using cached XML data from local storage');
                this.state.xmlData = storedXML;
                const result = this.parseXMLToTable(storedXML);
                this.initializePagination(); // Initialize pagination after parsing data
                return result;
            }
            throw error;
        }
    }

    /**
     * Parse XML string into table rows
     * @param {string} xmlString - XML data to parse
     * @returns {boolean} - True if parsing was successful
     */
    parseXMLToTable(xmlString) {
        console.log('🔄 Parsing XML data to table...');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString || this.state.xmlData, "text/xml");

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
     * Create a table row from XML element
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
     * Format amount as locale string
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
     * Get CSS class name for status color
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
 * Perform search using input value
 * Only runs if search input exists
 */
performSearch() {
    if (!this.searchInput) {
        console.log('⚠️ Search input is missing, cannot perform search');
        return;
    }
    
    const searchTerm = this.searchInput.value.toLowerCase();
    console.log(`🔎 Performing search for: "${searchTerm}"`);
    this.state.lastSearchTerm = searchTerm;
    
    // Reset to first page when performing a new search
    this.state.currentPage = 1;
    
    this.applyFilters();
}
    
    /**
 * Apply all filters (search, category, status)
 */
applyFilters() {
    console.log('🔍 Applying filters...');
    const searchTerm = this.state.lastSearchTerm;
    let narCategory = 'all';
    let statusFilter = 'all';
    
    // Only get values if elements exist
    if (this.narFilter) {
        narCategory = this.narFilter.value.toLowerCase();
        this.state.lastFilterCategory = narCategory;
    }
    
    if (this.statusFilter) {
        statusFilter = this.statusFilter.value.toLowerCase();
        this.state.currentStatusFilter = statusFilter;
    }

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

    // First pass: Apply filters to determine which rows match
    this.tableBody.querySelectorAll('tr').forEach(row => {
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
            // Ensure columns exists and has the field
            if (!this.columns || !this.columns[field]) {
                return false;
            }
            const columnConfig = this.columns[field];
            return columnConfig?.searchable && cell.textContent.toLowerCase().includes(searchTerm);
        });

        // Determine visibility based on filter criteria
        const visible = matchesCategory && matchesStatus && matchesSearch;
        
        // Mark all matching rows as potentially visible (final visibility depends on pagination)
        if (visible) {
            row.setAttribute('data-filter-match', 'true');
            matchCount++;
        } else {
            row.removeAttribute('data-filter-match');
            row.style.display = 'none';  // Hide non-matching rows immediately
        }
    });

    console.log(`🔍 Filter found ${matchCount} matching rows`);
    this.updateSearchResults(matchCount);
    
    // After filtering, update pagination which will handle the visibility of matching rows
    this.updatePagination();
}


/**
 * Update search results message
 * Handles missing filter elements gracefully
 * @param {number} matchCount - Number of matching rows
 */
updateSearchResults(matchCount) {
    const searchTerm = this.state.lastSearchTerm;
    let narCategory = this.state.lastFilterCategory || 'all';
    let statusFilter = this.state.currentStatusFilter || 'all';
    let narCategoryText = 'All Categories';
    
    // Only get values if elements exist
    if (this.narFilter) {
        // Get selected option text safely
        const selectedOption = this.narFilter.options[this.narFilter.selectedIndex];
        narCategoryText = selectedOption ? selectedOption.text : 'All Categories';
    }

    let message = `Found ${matchCount} results`;
    if (searchTerm) message += ` for "${searchTerm}"`;
    if (narCategory !== 'all') message += ` in category "${narCategoryText}"`;
    if (statusFilter !== 'all') message += ` with status "${statusFilter}"`;

    console.log(`📊 Search results: ${message}`);
    this.resultContainer.textContent = matchCount > 0 ? message : 'No results found.';
    
    // Store match count for reference
    this.state.visibleRowsCount = matchCount;
}

    

    /**
     * Reset table to initial state
     * Handles missing filter elements gracefully
     */
    resetTable() {
        console.log('🔄 Resetting table to initial state');
        
        // Reset elements if they exist
        if (this.searchInput) this.searchInput.value = '';
        if (this.narFilter) this.narFilter.value = 'all';
        if (this.statusFilter) this.statusFilter.value = 'all';
        
        this.state.lastSearchTerm = '';
        this.state.currentPage = 1; // Reset to the first page
        
        this.tableContainer.style.display = 'none';
        this.emptyState.style.display = 'block';
        this.resultContainer.style.display = 'none';
        
        this.tableBody.querySelectorAll('tr').forEach(row => row.style.display = '');
        this.updatePagination(); // Update pagination after reset
    }

    /**
     * Show error message to the user
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
     * Sort table by column
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
     * Get cell value for sorting
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
            // Remove commas and convert to number
            return parseFloat(value.replace(/,/g, '')) || 0;
        }
        
        return value.toLowerCase();
    }

    /**
     * Update sort indicators in table headers
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
            
            // Create sort icon if it doesn't exist
            if (!sortIcon) {
                sortIcon = document.createElement('span');
                sortIcon.className = 'sort-icon';
                currentHeader.appendChild(sortIcon);
            }
            
            sortIcon.textContent = direction === 'asc' ? ' ↑' : ' ↓';
        }
    }

    /**
     * Reorder table rows after sorting
     * @param {Array<HTMLTableRowElement>} rows - Sorted rows
     */
    reorderRows(rows) {
        this.tableBody.innerHTML = '';
        rows.forEach(row => this.tableBody.appendChild(row));
        console.log(`🔄 Reordered ${rows.length} rows in table`);
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
        navigator.serviceWorker.register('/accounts.office.cheque.inquiry/service-worker.js', { scope: '/accounts.office.cheque.inquiry/' })
            .then(registration => console.log('✅ ServiceWorker registered successfully, scope:', registration.scope))
            .catch(err => console.error('❌ ServiceWorker registration failed:', err));
    });
}
