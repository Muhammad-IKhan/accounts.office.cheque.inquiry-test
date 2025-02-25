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
            debugMode: false // Enable detailed logging for debugging.  Set to false for production.
        };

        if (this.config.debugMode) {
            console.log('🚀 Initializing XMLTableHandler...');
        }

        try {
            // Initialize all components
            this.defineColumns();
            this.initializeDOMElements();
            this.initializeState();
            this.initializeEventListeners();
            this.initializePagination(); // Moved initialization here

            // Fetch and display data
            this.fetchXMLData()
                .then(() => {
                    this.resetTable();
                    if (this.config.debugMode) {
                        console.log('✅ Initial data load complete');
                    }
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
        if (this.config.debugMode) {
            console.log('📊 Defining table columns...');
        }
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
        if (this.config.debugMode) {
            console.log('🔍 Finding DOM elements...');
        }

        // Essential elements that must exist
        const essentialElements = {
            tableBody: 'checksTable',
            tableContainer: 'tableContainer',
            emptyState: 'emptyState',
            resultContainer: 'result',
            searchInput: 'search',
            narFilter: 'narCategory',
            statusFilter: 'statusFilter',
            paginationContainer: 'pagination',
            searchBtn: 'searchBtn',
            rowsPerPageSelect: 'rowsPerPage'
        };

        // Check essential elements
        for (const [prop, id] of Object.entries(essentialElements)) {
            const element = document.getElementById(id);
            if (!element) {
                throw new Error(`Required element #${id} not found in DOM`);
            }
            this[prop] = element;
            if (this.config.debugMode) {
                console.log(`✓ Found essential element #${id}`);
            }
        }
    }

    /**
     * Initialize application state with default values.
     */
    initializeState() {
        if (this.config.debugMode) {
            console.log('🏁 Initializing application state...');
        }
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

        // Set initial rows per page from select box if available
        if (this.rowsPerPageSelect) {
            this.state.rowsPerPage = parseInt(this.rowsPerPageSelect.value) || this.config.rowsPerPage;
        }
    }

    /**
     * Setup all event listeners for search, filter, pagination, and sorting.
     */
    initializeEventListeners() {
        if (this.config.debugMode) {
            console.log('👂 Setting up event listeners...');
        }

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
            this.changeRowsPerPage(parseInt(this.rowsPerPageSelect.value));
        });

        // Sorting events
        document.querySelectorAll('th[data-column]').forEach(header => {
            header.addEventListener('click', () => this.sortTable(header.dataset.column));
        });

        if (this.config.debugMode) {
            console.log('✅ Event listeners initialized');
        }
    }


    /**
     * Initialize pagination controls.  Now called directly from the constructor.
     */
    initializePagination() {
        if (!this.paginationContainer) {
            console.warn('⚠️ Pagination container is missing, disabling pagination'); // Use warn instead of log
            this.state.paginationEnabled = false;
            return;
        }

        if (this.config.debugMode) {
            console.log('🔢 Initializing pagination controls...');
        }

        this.updatePagination();
    }

    /**
     * Update pagination based on current page and rows per page.
     */
    updatePagination() {
        if (!this.state.paginationEnabled || !this.paginationContainer) {
            if (this.config.debugMode) {
                console.log('⏩ Pagination is disabled or container missing, skipping update');
            }
            return;
        }

        if (this.config.debugMode) {
            console.log(`📄 Updating pagination for page ${this.state.currentPage}`);
        }

        // Get all visible rows
        const visibleRows = Array.from(this.tableBody.querySelectorAll('tr'))
            .filter(row => row.style.display !== 'none');

        this.state.visibleRowsCount = visibleRows.length;

        if (this.config.debugMode) {
            console.log(`👁️ Found ${this.state.visibleRowsCount} visible rows`);
        }


        // Calculate total pages
        const totalPages = Math.max(1, Math.ceil(this.state.visibleRowsCount / this.state.rowsPerPage));

        // Ensure current page is valid
        this.state.currentPage = Math.min(Math.max(1, this.state.currentPage), totalPages);



        if (this.config.debugMode) {
            console.log(`📚 Total pages: ${totalPages}, Current page: ${this.state.currentPage}`);
        }

        // Calculate start and end indices for current page
        const startIndex = (this.state.currentPage - 1) * this.state.rowsPerPage;
        const endIndex = startIndex + this.state.rowsPerPage;

        // Update row visibility based on current page
        visibleRows.forEach((row, index) => {
            row.style.display = (index >= startIndex && index < endIndex) ? '' : 'none';
        });

        this.updateResultText(totalPages);

        // Render pagination controls
        this.renderPaginationControls(totalPages);
    }

    /**
     * Update the result text with pagination information.
     * @param {number} totalPages - The total number of pages.
     */
    updateResultText(totalPages) {
        if (this.resultContainer && this.state.visibleRowsCount > 0) {
            const resultText = this.resultContainer.textContent;
            const paginationInfo = ` (Page ${this.state.currentPage} of ${totalPages})`;

            if (!resultText.includes('Page')) {
                this.resultContainer.textContent = resultText + paginationInfo;
            } else {
                // Replace existing pagination info
                this.resultContainer.textContent = resultText.replace(/\s\(Page \d+ of \d+\)/, paginationInfo);
            }
        }
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
            if (this.config.debugMode) {
                console.log('🔢 Hiding pagination controls (single page)');
            }
            return;
        }

        // Always show pagination controls when there are multiple pages
        this.paginationContainer.style.display = 'flex';
        if (this.config.debugMode) {
            console.log('🔢 Rendering pagination controls for', totalPages, 'pages');
        }

        // Create pagination container structure
        const paginationUl = document.createElement('ul');
        paginationUl.className = 'pagination';
        this.paginationContainer.appendChild(paginationUl);

        // Previous Button
        this.createPaginationButton('Previous', () => {
            if (this.state.currentPage > 1) {
                this.goToPage(this.state.currentPage - 1);
            }
        }, this.state.currentPage === 1, paginationUl, 'prev');

        // Page buttons with ellipsis
        const pages = this.getPageNumbers(this.state.currentPage, totalPages);
        pages.forEach(page => {
            if (page === '...') {
                const li = document.createElement('li');
                li.className = 'page-item disabled';
                const span = document.createElement('span');
                span.className = 'page-link';
                span.textContent = '...';
                li.appendChild(span);
                paginationUl.appendChild(li);
            } else {
                this.createPaginationButton(page, () => {
                    this.goToPage(page);
                }, false, paginationUl, 'number', this.state.currentPage === page);
            }
        });

        // Next Button
        this.createPaginationButton('Next', () => {
            if (this.state.currentPage < totalPages) {
                this.goToPage(this.state.currentPage + 1);
            }
        }, this.state.currentPage === totalPages, paginationUl, 'next');

        // Add page info text
        const pageInfoDiv = document.createElement('div');
        pageInfoDiv.className = 'pagination-info';
        pageInfoDiv.textContent = `Page ${this.state.currentPage} of ${totalPages}`;
        this.paginationContainer.appendChild(pageInfoDiv);
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

        const pageNumbers = [];
        const leftOffset = Math.floor(maxPagesToShow / 2);
        const rightOffset = maxPagesToShow - leftOffset - 1;

        // Always show first page
        pageNumbers.push(1);

        if (currentPage <= 3) {
            // Near the beginning
            for (let i = 2; i <= Math.min(totalPages - 1, maxPagesToShow - 2); i++) {
                pageNumbers.push(i);
            }
            if (totalPages > maxPagesToShow - 1) {
                pageNumbers.push('...');
            }
        } else if (currentPage >= totalPages - 2) {
            // Near the end
            if (totalPages > maxPagesToShow - 1) {
                pageNumbers.push('...');
            }
            for (let i = Math.max(2, totalPages - (maxPagesToShow - 2)); i < totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            // Middle area
            pageNumbers.push('...');

            // Pages around current
            const startPage = Math.max(2, currentPage - Math.floor((maxPagesToShow - 4) / 2));
            const endPage = Math.min(totalPages - 1, startPage + (maxPagesToShow - 4));

            for (let i = startPage; i <= endPage; i++) {
                pageNumbers.push(i);
            }

            if (endPage < totalPages - 1) {
                pageNumbers.push('...');
            }
        }

        // Always show last page
        if (totalPages > 1) {
            pageNumbers.push(totalPages);
        }

        return pageNumbers;
    }

    /**
     * Create a pagination button with appropriate handlers.
     * @param {string|number} text - Button text
     * @param {Function} onClick - Click handler
     * @param {boolean} disabled - Whether button should be disabled
     * @param {HTMLElement} container - Container to append button to
     * @param {string} type - Button type (prev, next, number)
     * @param {boolean} active - Whether button should be marked as active
     * @returns {HTMLElement} - Created button element
     */
    createPaginationButton(text, onClick, disabled = false, container, type = 'number', active = false) {
        const li = document.createElement('li');
        li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''} page-${type}`;

        const button = document.createElement('button');
        button.className = 'page-link';
        button.textContent = text;
        button.disabled = disabled;

        if (!disabled) {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                onClick();
            });
        }

        li.appendChild(button);
        container.appendChild(li);
        return li;
    }

    /**
     * Go to a specific page.
     * @param {number} pageNumber - Page number to go to
     */
    goToPage(pageNumber) {
        const totalPages = Math.ceil(this.state.visibleRowsCount / this.state.rowsPerPage);

        // Validate page number
        if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > totalPages) {
            console.warn(`⚠️ Invalid page number: ${pageNumber}. Valid range: 1-${totalPages}`);
            return;
        }

        this.state.currentPage = pageNumber;
        if (this.config.debugMode) {
            console.log(`📄 Going to page: ${pageNumber}`);
        }
        this.updatePagination();
    }

    /**
     * Change rows per page.
     * @param {number} rowsPerPage - New rows per page value
     */
    changeRowsPerPage(rowsPerPage) {
        if (isNaN(rowsPerPage) || rowsPerPage < 1) {
            console.warn(`⚠️ Invalid rows per page value: ${rowsPerPage}`);
            return;
        }

        this.state.rowsPerPage = rowsPerPage;
        this.state.currentPage = 1; // Reset to first page
        if (this.config.debugMode) {
            console.log(`📐 Changed rows per page to: ${rowsPerPage}`);
        }

        // Update select box if available
        if (this.rowsPerPageSelect) {
            this.rowsPerPageSelect.value = rowsPerPage.toString();
        }

        this.updatePagination();
    }




    /**
     * Fetch XML data from server or cache.
     * @returns {Promise<boolean>} - True if data was successfully processed
     */
    async fetchXMLData() {
        if (this.config.debugMode) {
            console.log('📥 Fetching XML data...');
        }

        try {
            const filesResponse = await fetch('https://muhammad-ikhan.github.io/accounts.office.cheque.inquiry/public/data/files.json');
            if (!filesResponse.ok) throw new Error(`HTTP error! Status: ${filesResponse.status}`);
            const xmlFiles = await filesResponse.json();
            if (this.config.debugMode) {
                console.log(`📄 Found ${xmlFiles.length} XML files to process`);
            }

            let combinedXML = '<root>';
            for (const file of xmlFiles) {
                if (this.config.debugMode) {
                    console.log(`🔄 Processing file: ${file}`);
                }
                const fileResponse = await fetch(`https://muhammad-ikhan.github.io/accounts.office.cheque.inquiry/public/data/${file}`);
                if (!fileResponse.ok) throw new Error(`HTTP error for file: ${file}`);
                let xmlContent = await fileResponse.text();
                xmlContent = xmlContent.replace(/<\?xml[^>]+\?>/, '').replace(/<\/?root>/g, '');
                combinedXML += xmlContent;
            }
            combinedXML += '</root>';

            if (this.config.debugMode) {
                console.log('💾 Saving combined XML to local storage');
            }
            localStorage.setItem('xmlData', combinedXML);
            this.state.xmlData = combinedXML;

            const result = this.parseXMLToTable(combinedXML);
            return result;
        } catch (error) {
            console.error('❌ Error fetching XML:', error);
            const storedXML = localStorage.getItem('xmlData');
            if (storedXML && this.config.enableCaching) {
                if (this.config.debugMode) {
                    console.log('📋 Using cached XML data from local storage');
                }
                this.state.xmlData = storedXML;
                const result = this.parseXMLToTable(storedXML);
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
        if (this.config.debugMode) {
            console.log('🔄 Parsing XML data to table...');
        }
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");

        if (xmlDoc.querySelector('parsererror')) {
            const error = xmlDoc.querySelector('parsererror').textContent;
            console.error('❌ XML parsing error:', error);
            throw new Error('XML parsing error: ' + error);
        }

        const entries = xmlDoc.getElementsByTagName('G_PVN');
        if (this.config.debugMode) {
            console.log(`📊 Found ${entries.length} entries to display`);
        }

        this.tableBody.innerHTML = '';

        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();
        Array.from(entries).forEach((element, index) => {
            const row = this.createTableRow(element);
            fragment.appendChild(row);
            if (this.config.debugMode && (index === 0 || index === entries.length - 1 || index % 100 === 0)) {
                console.log(`📝 Processed ${index + 1}/${entries.length} rows`);
            }
        });
        this.tableBody.appendChild(fragment);

        this.state.visibleRowsCount = entries.length;
        if (this.config.debugMode) {
            console.log('✅ XML parsing complete');
        }
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
            let value = '';

            try {
                const fieldElement = element.getElementsByTagName(field)[0];
                value = fieldElement ? fieldElement.textContent.trim() : '';
            } catch (error) {
                console.warn(`⚠️ Error extracting ${field}:`, error);
            }

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
            const numValue = parseFloat(value.replace(/,/g, ''));
            return !isNaN(numValue) ? numValue.toLocaleString('en-US') : '0';
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
        if (!status) return 'status-gray';

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
            if (this.config.debugMode) {
                console.log(`🔎 Search rejected, term too short: "${searchTerm}" (${searchTerm.length}/${this.config.minSearchChars})`);
            }
            return;
        }

        if (this.config.debugMode) {
            console.log(`🔎 Performing search for: "${searchTerm}"`);
        }
        this.state.lastSearchTerm = searchTerm;
        this.state.currentPage = 1;
        this.applyFilters();
    }

    /**
     * Apply all filters (search, category, status).
     */
    applyFilters() {
        if (this.config.debugMode) {
            console.log('🔍 Applying filters...');
        }
        const searchTerm = this.state.lastSearchTerm;
        const narCategory = this.narFilter.value.toLowerCase();
        const statusFilter = this.statusFilter.value.toLowerCase();

        if (this.config.debugMode) {
            console.log(`🔍 Filter criteria: search="${searchTerm}", category="${narCategory}", status="${statusFilter}"`);
        }

        // Reset if no filters are applied
        if (!searchTerm && narCategory === 'all' && statusFilter === 'all') {
            if (this.config.debugMode) {
                console.log('🔄 No filters active, resetting table');
            }
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

        if (this.config.debugMode) {
            console.log(`🔍 Filter found ${matchCount} matching rows`);
        }
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

        // Get text from the selected option
        const narCategoryText = narCategory !== 'all' ?
            this.narFilter.options[this.narFilter.selectedIndex].text : '';

        let message = `Found ${matchCount} results`;
        if (searchTerm) message += ` for "${searchTerm}"`;
        if (narCategory !== 'all') message += ` in category "${narCategoryText}"`;
        if (statusFilter !== 'all') message += ` with status "${statusFilter}"`;

        if (this.config.debugMode) {
            console.log(`📊 Search results: ${message}`);
        }
        this.resultContainer.textContent = matchCount > 0 ? message : 'No results found.';
    }

    /**
     * Reset table to initial state.
     */
    resetTable() {
        if (this.config.debugMode) {
            console.log('🔄 Resetting table to initial state');
        }
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
            this.resultContainer.textContent = `Showing all ${this.state.visibleRowsCount} rows`;
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

        if (this.config.debugMode) {
            console.log(`🔃 Sorting by ${column} (${type}) in ${direction} order`);
        }

        const rows = Array.from(this.tableBody.getElementsByTagName('tr'));
        rows.sort((a, b) => {
            const aValue = this.getCellValue(a, column, type);
            const bValue = this.getCellValue(b, column, type);

            // Handle null/undefined values - push them to the end
            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;

            return direction === 'asc' ?
                aValue > bValue ? 1 : aValue < bValue ? -1 : 0 :
                aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        });

        this.updateSortIndicators(column, direction);
        this.reorderRows(rows);

        this.state.sortColumn = column;
        this.state.sortDirection = direction;
        if (this.config.debugMode) {
            console.log('✅ Sorting complete');
        }
    }

    /**
     * Get cell value for sorting.
     * @param {HTMLTableRowElement} row - Table row
     * @param {string} column - Column name
     * @param {string} type - Data type
     * @returns {string|number|null} - Cell value
     */
    getCellValue(row, column, type) {
        const cell = row.querySelector(`td[data-field="${column}"]`);
        if (!cell) {
            console.warn(`⚠️ Cell not found for field ${column}`);
            return type === 'number' ? 0 : '';
        }

        const value = cell.textContent.trim();
        if (!value) return type === 'number' ? 0 : '';

        if (type === 'number') {
            // Remove commas and convert to float
            const numValue = parseFloat(value.replace(/,/g, ''));
            return isNaN(numValue) ? 0 : numValue;
        }

        return value.toLowerCase();
    }

    /**
     * Update sort indicators in table headers.
     * @param {string} column - Column being sorted
     * @param {string} direction - Sort direction
     */
    updateSortIndicators(column, direction) {
        // Reset all sort indicators
        document.querySelectorAll('th[data-column]').forEach(header => {
            // Remove active class from all headers
            header.classList.remove('sort-asc', 'sort-desc');

            // Clear existing sort icons
            const sortIcon = header.querySelector('.sort-icon');
            if (sortIcon) {
                sortIcon.textContent = '';
            }
        });

        // Update current header
        const currentHeader = document.querySelector(`th[data-column="${column}"]`);
        if (currentHeader) {
            // Add appropriate class
            currentHeader.classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');

            // Update or create sort icon
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
        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();
        rows.forEach(row => fragment.appendChild(row));
        this.tableBody.innerHTML = '';
        this.tableBody.appendChild(fragment);
        if (this.config.debugMode) {
            console.log(`🔄 Reordered ${rows.length} rows in table`);
        }

        // Update pagination after reordering
        this.updatePagination();
    }
}

// Initialize handler when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const handler = new XMLTableHandler();
    if (handler.config.debugMode) {
        console.log('🌐 Document loaded, initializing XMLTableHandler...');
    }
    try {
        window.tableHandler = handler; // Assign instance to window
        if (handler.config.debugMode) {
            console.log('✅ XMLTableHandler successfully initialized');
        }
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
        const handler = new XMLTableHandler(); // create temporary instance to access its debugMode

        if (handler.config.debugMode) {
            console.log('🔄 Registering Service Worker...');
        }
        navigator.serviceWorker
            .register('/service-worker.js')
            .then((registration) => {
                if (handler.config.debugMode) {
                    console.log('✅ ServiceWorker registered successfully, scope:', registration.scope);
                }
            })
            .catch((err) => console.error('❌ ServiceWorker registration failed:', err));
    });
}


