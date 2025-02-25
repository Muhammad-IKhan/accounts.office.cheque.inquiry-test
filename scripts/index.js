/**
 * XMLTableHandler - Modern XML data table component with advanced features
 *
 * Features:
 * - XML data loading with caching and offline support
 * - Smart pagination with configurable page size
 * - Advanced filtering with multi-criteria support
 * - Responsive design with graceful fallbacks
 * - Detailed logging for debugging and monitoring
 * - Dynamic sorting for all data columns
 * - Search with configurable minimum character threshold
 * - Status visualization with color coding
 *
 * @version 2.0.0
 * @author Improved by Claude - February 2025
 */
class XMLTableHandler {
    /**
     * Initialize the XML Table Handler with all necessary components
     * This handles XML data loading, parsing, filtering, sorting, and pagination
     * Implements modern ES6+ features and performance optimizations
     */
    constructor() {
        // Global configuration object for easy customization
        this.config = {
            maxPagesToShow: 5, // Maximum number of pages to show in pagination UI
            rowsPerPage: 10, // Default rows per page
            minSearchChars: 3, // Minimum characters required for search (reduced from 5)
            debounceTime: 300, // Debounce time for search in milliseconds
            localStorageKey: 'xmlTableData', // Key for storing XML data in localStorage
            serviceWorkerPath: '/accounts.office.cheque.inquiry/service-worker.js', // Path to service worker
            dataFilesUrl: '/accounts.office.cheque.inquiry/public/data/files.json', // URL to JSON file listing XML data files
            dataBasePath: '/accounts.office.cheque.inquiry/public/data/', // Base path for XML data files
            enableProgressiveLoading: false, // Enable progressive data loading for large datasets
            enableLiveSearch: true, // Enable live search as user types
            showPerformanceMetrics: false, // Show performance metrics in console
            autoSaveFilters: true, // Automatically save filter state in localStorage
            defaultSortColumn: null, // Default column to sort by (null = no default sorting)
            defaultSortDirection: 'asc', // Default sort direction
            persistUserPreferences: true // Save user preferences like page size to localStorage
        };

        console.log('🚀 Initializing XMLTableHandler v2.0.0...');

        // Performance tracking
        this.perfMetrics = {
            startTime: performance.now(),
            dataLoadTime: 0,
            renderTime: 0,
            totalInitTime: 0
        };

        try {
            this.defineColumns();
            this.initializeDOMElements();
            this.initializeState();
            this.loadUserPreferences();
            this.initializeEventListeners();
            this.initializeResizeObserver();
            this.initializePagination();  // Initialize pagination here

            // Fetch and display data with improved error handling
            this.fetchXMLData()
                .then(() => {
                    this.resetTable();
                    this.perfMetrics.totalInitTime = performance.now() - this.perfMetrics.startTime;
                    if (this.config.showPerformanceMetrics) {
                        console.log(`✅ Initial data load complete in ${this.perfMetrics.dataLoadTime.toFixed(2)}ms`);
                        console.log(`✅ Total initialization time: ${this.perfMetrics.totalInitTime.toFixed(2)}ms`);
                    }
                })
                .catch(error => {
                    console.error('❌ Initial data load failed:', error);
                    this.showError(`Failed to load data: ${error.message}. Please check your connection and try again.`);
                });

            // Register service worker for offline capabilities
            this.registerServiceWorker();
        } catch (error) {
            console.error('❌ Constructor Error:', error);
            this.showError(`Initialization failed: ${error.message}. Please refresh the page or contact support.`);
        }
    }

    /**
     * Define table columns configuration with enhanced metadata
     * Each column has its index, data type, display title, search properties
     * and additional configuration for formatting and validation
     */
    defineColumns() {
        console.log('📊 Defining table columns with enhanced metadata...');
        this.columns = {
            NARRATION: {
                index: 0,
                type: 'string',
                required: true,
                title: 'Narration',
                searchable: true,
                sortable: true,
                formatter: (value) => value, // Pass-through formatter
                defaultWidth: '40%',
                tooltip: 'Payment narration or description'
            },
            AMOUNT: {
                index: 1,
                type: 'number',
                required: true,
                title: 'Amount',
                searchable: false,
                sortable: true,
                formatter: (value) => this.formatAmount(value),
                defaultWidth: '15%',
                tooltip: 'Transaction amount'
            },
            CHEQ_NO: {
                index: 2,
                type: 'number',
                required: true,
                title: 'Cheque No',
                searchable: true, // Changed to true for better searchability
                sortable: true,
                formatter: (value) => value,
                defaultWidth: '15%',
                tooltip: 'Cheque number'
            },
            NAR: {
                index: 3,
                type: 'string',
                required: true,
                title: 'Category', // Changed from NAR to Category for clarity
                searchable: true, // Changed to true for better searchability
                sortable: true,
                formatter: (value) => value,
                defaultWidth: '15%',
                tooltip: 'Payment category'
            },
            DD: {
                index: 4,
                type: 'string',
                required: true,
                title: 'Status',
                searchable: true, // Changed to true for better filterability
                sortable: true,
                formatter: (value) => value,
                defaultWidth: '15%',
                tooltip: 'Current cheque status',
                cssClassProvider: (value) => this.getStatusColor(value)
            }
        };

        // Create column mapping for easy access
        this.columnMap = Object.entries(this.columns).reduce((map, [key, config]) => {
            map[key] = config;
            return map;
        }, {});

        console.log(`✓ Defined ${Object.keys(this.columns).length} table columns with enhanced metadata`);
    }

    /**
     * Initialize all required DOM elements with improved error handling
     * Creates missing pagination elements if needed
     * Falls back gracefully for non-critical elements
     * Implements responsive design principles
     */
    initializeDOMElements() {
        console.log('🔍 Finding and initializing DOM elements...');

        // Essential elements that must exist for the component to function
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
            'rowsPerPage': 'rowsPerPageSelect',
            'tableHeader': 'tableHeader', // Added to support header customization
            'resetButton': 'resetButton', // Added reset button
            'loadingIndicator': 'loadingIndicator', // Added loading indicator
            'errorContainer': 'errorContainer' // Added dedicated error container
        };

        // Check essential elements
        for (const [id, prop] of Object.entries(essentialElements)) {
            const element = document.getElementById(id);
            if (!element) {
                throw new Error(`Required element #${id} not found in DOM. This component cannot function without it.`);
            }
            this[prop] = element;
            console.log(`✓ Found essential element #${id}`);
        }

        // Handle optional elements with improved fallbacks
        for (const [id, prop] of Object.entries(optionalElements)) {
            let element = document.getElementById(id);

            if (!element) {
                console.warn(`⚠️ Optional element #${id} not found in DOM. Creating fallback.`);
                element = this.createFallbackElement(id);
                this[prop] = element;
            } else {
                this[prop] = element;
                console.log(`✓ Found optional element #${id}`);
            }
        }

        // Set up header cells if table header exists
        if (this.tableHeader) {
            this.setupTableHeader();
        }

        console.log('✅ DOM element initialization complete');
    }

    /**
     * Set up table header with sorting indicators and tooltips
     * Creates header cells for each column defined in the columns configuration
     */
    setupTableHeader() {
        console.log('📋 Setting up table header with sorting capabilities...');
        // Clear existing header
        this.tableHeader.innerHTML = '';

        // Create header row
        const headerRow = document.createElement('tr');

        // Add header cells for each column
        Object.entries(this.columns).forEach(([field, config]) => {
            const cell = document.createElement('th');
            cell.textContent = config.title;
            cell.setAttribute('data-column', field);
            cell.setAttribute('title', config.tooltip || config.title);

            if (config.sortable) {
                cell.classList.add('sortable');

                // Create sort indicator
                const sortIcon = document.createElement('span');
                sortIcon.className = 'sort-icon';
                cell.appendChild(sortIcon);

                // Add event listener for sorting
                cell.addEventListener('click', () => this.sortTable(field));
            }

            // Set width if specified
            if (config.defaultWidth) {
                cell.style.width = config.defaultWidth;
            }

            headerRow.appendChild(cell);
        });

        this.tableHeader.appendChild(headerRow);
        console.log('✓ Table header setup complete');
    }

    /**
     * Create fallback elements for missing DOM elements
     * Improved with better styling and accessibility
     * @param {string} id - ID of the missing element
     * @returns {HTMLElement} - Created fallback element
     */
    createFallbackElement(id) {
        const container = document.createElement('div');
        container.id = id + '_fallback';
        container.className = 'xml-table-fallback-element';

        switch (id) {
            case 'pagination':
                container.className = 'pagination-container';

                // Add aria label for accessibility
                container.setAttribute('aria-label', 'Table pagination');

                // Append to result container or table container
                if (this.resultContainer) {
                    this.resultContainer.after(container);
                } else if (this.tableContainer) {
                    this.tableContainer.after(container);
                } else {
                    document.body.appendChild(container);
                }
                console.log('📄 Created fallback pagination container with accessibility support');
                break;

            case 'search':
                container.innerHTML = `
                    <div class="search-container">
                        <input type="text" placeholder="Search (min ${this.config.minSearchChars} characters)..."
                            class="form-control" aria-label="Search table contents" />
                        <div class="search-icon">🔍</div>
                    </div>
                `;

                // Style the container
                container.style.marginBottom = '15px';
                container.style.position = 'relative';

                this.tableContainer.before(container);
                console.log('🔍 Created fallback search input with icon and accessibility');
                return container.querySelector('input');

            case 'searchBtn':
                container.innerHTML = `<button class="btn btn-primary">Search</button>`;
                container.querySelector('button').setAttribute('aria-label', 'Perform search');

                // Try to append next to search input if it exists
                const searchInput = document.getElementById('search') ||
                    document.getElementById('search_fallback');
                if (searchInput) {
                    searchInput.after(container);
                } else {
                    this.tableContainer.before(container);
                }
                console.log('🔍 Created fallback search button with accessibility');
                return container.querySelector('button');

            case 'narCategory':
                container.innerHTML = `
                    <div class="filter-container">
                        <label for="narCategory_select">Category:</label>
                        <select id="narCategory_select" class="form-control" aria-label="Filter by category">
                            <option value="all">All Categories</option>
                        </select>
                    </div>
                `;

                container.style.marginBottom = '15px';
                container.style.marginRight = '10px';
                container.style.display = 'inline-block';

                this.tableContainer.before(container);
                console.log('📋 Created fallback NAR filter with label and accessibility');
                return container.querySelector('select');

            case 'statusFilter':
                container.innerHTML = `
                    <div class="filter-container">
                        <label for="statusFilter_select">Status:</label>
                        <select id="statusFilter_select" class="form-control" aria-label="Filter by status">
                            <option value="all">All Statuses</option>
                        </select>
                    </div>
                `;

                container.style.marginBottom = '15px';
                container.style.display = 'inline-block';

                this.tableContainer.before(container);
                console.log('📋 Created fallback status filter with label and accessibility');
                return container.querySelector('select');

            case 'rowsPerPage':
                container.innerHTML = `
                    <div class="rows-per-page-container">
                        <label for="rowsPerPage_select">Show:</label>
                        <select id="rowsPerPage_select" class="form-control" aria-label="Rows per page">
                            <option value="10">10 rows</option>
                            <option value="25">25 rows</option>
                            <option value="50">50 rows</option>
                            <option value="100">100 rows</option>
                            <option value="250">250 rows</option>
                        </select>
                    </div>
                `;

                // Style the container
                container.style.marginRight = '15px';
                container.style.display = 'inline-block';

                // Try to append near pagination if it exists
                const paginationContainer = document.getElementById('pagination') ||
                    document.getElementById('pagination_fallback');
                if (paginationContainer) {
                    paginationContainer.before(container);
                } else {
                    this.tableContainer.after(container);
                }
                console.log('📄 Created fallback rows per page selector with label and accessibility');
                return container.querySelector('select');

            case 'resetButton':
                container.innerHTML = `
                    <button class="btn btn-secondary" aria-label="Reset all filters">
                        <span aria-hidden="true">↺</span> Reset
                    </button>
                `;

                // Find a good place to put the reset button
                const searchBtn = document.getElementById('searchBtn') ||
                    document.getElementById('searchBtn_fallback');
                if (searchBtn) {
                    searchBtn.after(container);
                } else {
                    this.tableContainer.before(container);
                }

                console.log('↺ Created fallback reset button');
                return container.querySelector('button');

            case 'loadingIndicator':
                container.innerHTML = `
                    <div class="loading-spinner" aria-live="polite" aria-busy="true">
                        <div class="spinner"></div>
                        <span>Loading data...</span>
                    </div>
                `;

                // Style the loading spinner
                const spinner = container.querySelector('.spinner');
                spinner.style.width = '30px';
                spinner.style.height = '30px';
                spinner.style.border = '3px solid #f3f3f3';
                spinner.style.borderTop = '3px solid #3498db';
                spinner.style.borderRadius = '50%';
                spinner.style.animation = 'spin 1s linear infinite';

                // Add keyframe animation
                const style = document.createElement('style');
                style.innerHTML = `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);

                // Hide by default
                container.style.display = 'none';
                container.style.justifyContent = 'center';
                container.style.alignItems = 'center';
                container.style.padding = '20px';

                this.tableContainer.before(container);
                console.log('⏳ Created fallback loading indicator with animation');
                return container;

            case 'errorContainer':
                container.innerHTML = `
                    <div class="error-message alert alert-danger" role="alert">
                    </div>
                `;

                // Hide by default
                container.style.display = 'none';
                container.style.marginBottom = '15px';

                this.tableContainer.before(container);
                console.log('⚠️ Created fallback error container for displaying error messages');
                return container;

            case 'tableHeader':
                const table = document.getElementById('checksTable');
                if (table) {
                    const thead = document.createElement('thead');
                    thead.id = 'tableHeader_fallback';
                    table.insertBefore(thead, table.firstChild);
                    console.log('<thead> Table Header created')
                    return thead;
                }
                break;

            default:
                console.warn(`⚠️ Unknown fallback element requested: ${id}`);
                return null;
        }

        return container;
    }

    /**
     * Initialize application state with default values and localStorage
     * Implements debounce for live search
     * Handles filter and sort parameters
     */
    initializeState() {
        console.log('🏁 Initializing application state with default values...');
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
            sortColumn: this.config.defaultSortColumn,
            sortDirection: this.config.defaultSortDirection,
            filterState: {},
            isDataLoading: false
        };

        // Restore filters from localStorage if enabled
        if (this.config.autoSaveFilters && localStorage.getItem('filterState')) {
            this.state.filterState = JSON.parse(localStorage.getItem('filterState'));
        }

        // Debounce function for live search
        this.debouncedSearch = this.debounce(() => {
            this.performSearch();
        }, this.config.debounceTime);

        console.log('✅ Application state initialized');
    }

    /**
     * Save user preferences to localStorage
     * Can persist rows per page, filter states, and sort settings
     */
    saveUserPreferences() {
        if (!this.config.persistUserPreferences) return;

        const preferences = {
            rowsPerPage: this.state.rowsPerPage,
            filterState: this.state.filterState,
            sortColumn: this.state.sortColumn,
            sortDirection: this.state.sortDirection
        };

        localStorage.setItem('userPreferences', JSON.stringify(preferences));
        console.log('💾 User preferences saved to localStorage');
    }

    /**
     * Load user preferences from localStorage
     * Restores rows per page, filter states, and sort settings
     */
    loadUserPreferences() {
        if (!this.config.persistUserPreferences) return;

        const storedPreferences = localStorage.getItem('userPreferences');
        if (storedPreferences) {
            const preferences = JSON.parse(storedPreferences);
            this.state.rowsPerPage = preferences.rowsPerPage || this.config.rowsPerPage;
            this.state.filterState = preferences.filterState || {};
            this.state.sortColumn = preferences.sortColumn || null;
            this.state.sortDirection = preferences.sortDirection || 'asc';

            // Apply persisted preferences
            if (this.rowsPerPageSelect) {
                this.rowsPerPageSelect.value = this.state.rowsPerPage;
            }
            this.applyFilters();
            if (this.state.sortColumn) {
                this.sortTable(this.state.sortColumn);
            }

            console.log('📋 User preferences loaded from localStorage');
        }
    }

    /**
     * Initialize event listeners with debounce for search and filter events
     * Handles sort events and progressive loading triggers
     * Uses modern event delegation for performance
     */
    initializeEventListeners() {
        console.log('👂 Setting up event listeners...');

        // Search events with debounce
        if (this.searchInput) {
            if (this.config.enableLiveSearch) {
                this.searchInput.addEventListener('input', () => this.debouncedSearch());
            } else {
                this.searchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') this.performSearch();
                });
            }
        }

        if (this.searchBtn) {
            this.searchBtn.addEventListener('click', () => this.performSearch());
        }

        // Filter events with filter state saving
        if (this.narFilter) {
            this.narFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }

        if (this.statusFilter) {
            this.statusFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }

        // Reset button event listener
        if (this.resetButton) {
            this.resetButton.addEventListener('click', () => this.resetTable());
        }

        // Pagination events
        if (this.rowsPerPageSelect) {
            this.rowsPerPageSelect.addEventListener('change', () => {
                this.changeRowsPerPage(parseInt(this.rowsPerPageSelect.value));
            });
        }

        // Sorting events - moved to setupTableHeader
        // No need to initialize here as they are bound dynamically

        console.log('✅ Event listeners initialized');
    }

    /**
     * Initialize the resize observer to adjust the number of rows per page
     * dynamically based on the viewport size
     */
    initializeResizeObserver() {
        // Create a new ResizeObserver instance
        this.resizeObserver = new ResizeObserver(entries => {
            // Check if there are any entries
            if (entries && entries.length > 0) {
                const entry = entries[0];
                const width = entry.contentRect.width;

                // Define breakpoints
                const smallBreakpoint = 600;
                const mediumBreakpoint = 900;

                // Define the new number of rows per page based on width
                let newRowsPerPage;
                if (width < smallBreakpoint) {
                    newRowsPerPage = 5;
                } else if (width < mediumBreakpoint) {
                    newRowsPerPage = 10;
                } else {
                    newRowsPerPage = 20;
                }

                // Check if newRowsPerPage is different from current value
                if (newRowsPerPage !== this.state.rowsPerPage) {
                    this.changeRowsPerPage(newRowsPerPage);
                }
            }
        });

        // Start observing the table container
        if (this.tableContainer) {
            this.resizeObserver.observe(this.tableContainer);
            console.log("👀 ResizeObserver is active on TableContainer");
        } else {
            console.warn("⚠️ No TableContainer. ResizeObserver won't work");
        }
    }

    /**
     * Registers the service worker for offline capabilities
     */
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register(this.config.serviceWorkerPath)
                .then((registration) => {
                    console.log('✅ ServiceWorker registered successfully, scope:', registration.scope);
                })
                .catch((err) => console.error('❌ ServiceWorker registration failed:', err));
        }
    }

    /**
     * Fetch XML data from server or cache using progressive loading
     * Implements enhanced error handling and performance tracking
     */
    async fetchXMLData() {
        console.log('📥 Fetching XML data with progressive loading...');
        this.showLoadingIndicator();
        this.perfMetrics.dataStartTime = performance.now();

        try {
            // Fetch list of XML data files from JSON
            const filesResponse = await fetch(this.config.dataFilesUrl);
            if (!filesResponse.ok) {
                throw new Error(`HTTP error! Status: ${filesResponse.status} - Unable to load data files list.`);
            }
            const xmlFiles = await filesResponse.json();
            console.log(`📄 Found ${xmlFiles.length} XML files to process`);

            let combinedXML = '<root>';
            for (const file of xmlFiles) {
                // Fetch each XML file progressively
                const fileResponse = await fetch(this.config.dataBasePath + file);
                if (!fileResponse.ok) {
                    console.warn(`⚠️ HTTP error fetching file: ${file}. Status: ${fileResponse.status}`);
                    continue; // Skip to the next file on error
                }
                let xmlContent = await fileResponse.text();
                xmlContent = xmlContent.replace(/<\?xml[^>]+\?>/, '').replace(/<\/?root>/g, '');
                combinedXML += xmlContent;

                // Optionally parse and render data progressively (optimize later)
                if (this.config.enableProgressiveLoading) {
                    //  this.parseXMLToTable(combinedXML + '</root>'); //TODO Optimize this
                }
            }
            combinedXML += '</root>';

            // Store combined XML data in localStorage for offline support
            localStorage.setItem(this.config.localStorageKey, combinedXML);
            this.state.xmlData = combinedXML;

            // Parse the complete XML to table
            const result = this.parseXMLToTable(combinedXML);

            this.perfMetrics.dataLoadTime = performance.now() - this.perfMetrics.dataStartTime;

            return result;

        } catch (error) {
            console.error('❌ Error fetching XML data:', error);
            this.hideLoadingIndicator();

            // Attempt to load data from cache
            const storedXML = localStorage.getItem(this.config.localStorageKey);
            if (storedXML) {
                console.warn('📋 Using cached XML data from localStorage as fallback');
                this.state.xmlData = storedXML;
                return this.parseXMLToTable(storedXML);
            } else {
                throw new Error(`Failed to load data: ${error.message}. No cached data available.`);
            }
        } finally {
            this.hideLoadingIndicator();
        }
    }

    /**
     * Parse XML string into table rows using DOMParser
     * Supports error handling, performance logging, and column formatting
     * Uses document fragments for improved performance
     * @param {string} xmlString - XML data to parse
     * @returns {boolean} - True if parsing was successful
     */
    parseXMLToTable(xmlString) {
        console.log('🔄 Parsing XML data to table...');
        this.perfMetrics.renderStartTime = performance.now();

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

        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();
        Array.from(entries).forEach(element => {
            const row = this.createTableRow(element);
            fragment.appendChild(row);
        });
        this.tableBody.appendChild(fragment);

        this.state.visibleRowsCount = entries.length;
        this.updatePagination();
        this.updateResultText(Math.ceil(this.state.visibleRowsCount / this.state.rowsPerPage));

        this.perfMetrics.renderTime = performance.now() - this.perfMetrics.renderStartTime;
        if (this.config.showPerformanceMetrics) {
            console.log(`✅ XML data rendered in ${this.perfMetrics.renderTime.toFixed(2)}ms`);
        }
        console.log('✅ XML parsing complete');

        return true;
    }

    /**
     * Create a table row from XML element
     * Supports column formatting and CSS class injection
     * Implements better error handling for individual cells
     * @param {Element} element - XML element to convert to row
     * @returns {HTMLTableRowElement} - The created table row
     */
    createTableRow(element) {
        const row = document.createElement('tr');
        const narValue = element.getElementsByTagName('NAR')[0]?.textContent?.trim() || '';
        row.setAttribute('data-nar', narValue.toLowerCase());

        Object.entries(this.columns).forEach(([field, config]) => {
            const cell = document.createElement('td');
            cell.setAttribute('data-field', field);

            try {
                let value = element.getElementsByTagName(field)[0]?.textContent?.trim() || '';
                // Apply column-specific formatting
                if (config.formatter) {
                    value = config.formatter(value);
                }
                cell.textContent = value;

                // Apply CSS class if provider exists
                if (config.cssClassProvider) {
                    const cssClass = config.cssClassProvider(value);
                    if (cssClass) {
                        cell.className = cssClass;
                    }
                }

            } catch (error) {
                console.warn(`⚠️ Error processing field ${field}:`, error);
                cell.textContent = 'Error'; // Display error in cell
                cell.classList.add('error-cell'); // Add error class for styling
            }

            row.appendChild(cell);
        });

        return row;
    }

    /**
     * Format amount as locale string with currency symbol
     * Handles invalid values gracefully and provides logging
     * @param {string} value - Amount value to format
     * @returns {string} - Formatted amount
     */
    formatAmount(value) {
        try {
            const numValue = parseFloat(value.replace(/,/g, ''));
            return !isNaN(numValue) ? numValue.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD'
            }) : '$0.00';
        } catch (error) {
            console.warn(`⚠️ Invalid amount value: ${value}`, error);
            return '$0.00';
        }
    }

    /**
     * Get CSS class name for status color
     * Implements more robust status mapping with logging
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
     * Perform search using input value with debounce
     * Clears any previous error messages
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
     * Apply all filters (search, category, status)
     * Stores filter state to localStorage if enabled
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

        // Update filter state
        this.state.filterState = {
            searchTerm: searchTerm,
            narCategory: narCategory,
            statusFilter: statusFilter
        };

        // Save filter state to localStorage if enabled
        if (this.config.autoSaveFilters) {
            localStorage.setItem('filterState', JSON.stringify(this.state.filterState));
            console.log('💾 Filter state saved to localStorage');
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
 * Update search results message with additional filter information
 * Displays a message if no results are found
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

    console.log(`📊 Search results: ${message}`);
    this.resultContainer.textContent = matchCount > 0 ? message : 'No results found.';
}

/**
 * Reset table to initial state
 * Clears filters, search term, and sort settings
 * Restores default sorting if configured
 */
resetTable() {
    console.log('🔄 Resetting table to initial state');
    this.searchInput.value = '';
    this.narFilter.value = 'all';
    this.statusFilter.value = 'all';

    this.state.lastSearchTerm = '';
    this.state.currentPage = 1;

    // Clear filter state
    this.state.filterState = {};

    // Remove filter state from localStorage if autoSaveFilters is enabled
    if (this.config.autoSaveFilters) {
        localStorage.removeItem('filterState');
        console.log('🗑️ Filter state removed from localStorage');
    }

    // Make all rows visible
    this.tableBody.querySelectorAll('tr').forEach(row => {
        row.style.display = '';
    });

    // Update visibility and pagination
    this.state.visibleRowsCount = this.tableBody.querySelectorAll('tr').length;
    this.updatePagination();
    this.updateResultText(Math.ceil(this.state.visibleRowsCount / this.state.rowsPerPage));

    // Restore default sorting if configured
    if (this.config.defaultSortColumn) {
        this.sortTable(this.config.defaultSortColumn);
    } else {
        this.clearSortIndicators(); // Ensure indicators are cleared if no default sort
        this.state.sortColumn = null;
        this.state.sortDirection = 'asc';
    }

    this.tableContainer.style.display = 'block';
    this.emptyState.style.display = (this.state.visibleRowsCount === 0) ? 'block' : 'none';
    this.resultContainer.style.display = 'block';
    this.updateSearchResults(this.state.visibleRowsCount); // Update message
}

/**
 * Clear sort indicators in table headers
 */
clearSortIndicators() {
    console.log('🧹 Clearing sort indicators from table headers...');
    document.querySelectorAll('th[data-column]').forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
        const sortIcon = header.querySelector('.sort-icon');
        if (sortIcon) {
            sortIcon.textContent = '';
        }
    });
    console.log('✓ Sort indicators cleared');
}

/**
 * Show error message to the user using the error container element
 * Sets aria-live attribute for accessibility
 * @param {string} message - Error message to display
 */
showError(message) {
    console.error('❌ Error:', message);
    this.errorContainer.innerHTML = `
        <div class="alert alert-danger" role="alert" aria-live="assertive">
            ${message}
        </div>
    `;
    this.errorContainer.style.display = 'block';
}

/**
 * Hide the error message container
 */
hideError() {
    this.errorContainer.style.display = 'none';
    this.errorContainer.innerHTML = '';
}

/**
 * Show loading indicator to the user
 */
showLoadingIndicator() {
    if (this.loadingIndicator) {
        this.loadingIndicator.style.display = 'flex';
        this.tableContainer.style.opacity = '0.5'; // Dim table
    }
}

/**
 * Hide loading indicator from the user
 */
hideLoadingIndicator() {
    if (this.loadingIndicator) {
        this.loadingIndicator.style.display = 'none';
        this.tableContainer.style.opacity = '1';
    }
}

/**
 * Sort table by column using enhanced sorting logic
 * Supports sorting by string, number, and date types
 * Updates sort indicators in table headers
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

        // Handle null/undefined values - push them to the end
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        // String comparison
        if (type === 'string') {
            return direction === 'asc' ?
                aValue.localeCompare(bValue) :
                bValue.localeCompare(aValue);
        }

        // Number comparison
        if (type === 'number') {
            return direction === 'asc' ?
                aValue - bValue :
                bValue - aValue;
        }

        // If none of the known types, revert to basic comparison
        return direction === 'asc' ?
            aValue > bValue ? 1 : aValue < bValue ? -1 : 0 :
            aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    });

    this.updateSortIndicators(column, direction);
    this.reorderRows(rows);

    this.state.sortColumn = column;
    this.state.sortDirection = direction;

    this.saveUserPreferences(); // Store sort preferences
    console.log('✅ Sorting complete');
}

/**
 * Get cell value for sorting
 * Handles different data types and provides better error handling
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
 * Update sort indicators in table headers
 * Supports visual styling and accessibility
 * @param {string} column - Column being sorted
 * @param {string} direction - Sort direction
 */
updateSortIndicators(column, direction) {
    console.log(`⬆️ Updating sort indicators for column: ${column}, direction: ${direction}`);

    // Reset all sort indicators
    document.querySelectorAll('th[data-column]').forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
        const sortIcon = header.querySelector('.sort-icon');
        if (sortIcon) {
            sortIcon.textContent = '';
        }
    });

    // Update current header
    const currentHeader = document.querySelector(`th[data-column="${column}"]`);
    if (currentHeader) {
        currentHeader.classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');
        const sortIcon = currentHeader.querySelector('.sort-icon');
        if (sortIcon) {
            sortIcon.textContent = direction === 'asc' ? ' ↑' : ' ↓';
        }
    }
    console.log('✓ Sort indicators updated');
}

/**
 * Reorder table rows after sorting
 * Uses document fragment for better performance
 * @param {Array<HTMLTableRowElement>} rows - Sorted rows
 */
reorderRows(rows) {
    // Use document fragment for better performance
    const fragment = document.createDocumentFragment();
    rows.forEach(row => fragment.appendChild(row));
    this.tableBody.innerHTML = '';
    this.tableBody.appendChild(fragment);

    console.log(`🔄 Reordered ${rows.length} rows in table`);

    // Update pagination after reordering
    this.updatePagination();
}

/**
 * Initialize pagination controls with accessibility support
 * Creates pagination buttons and sets up event listeners
 */
initializePagination() {
    if (!this.paginationContainer) {
        console.warn('⚠️ Pagination container is missing, disabling pagination');
        this.state.paginationEnabled = false;
        return;
    }

    console.log('🔢 Initializing pagination controls...');
    this.updatePagination();
}

/**
 * Update pagination based on current page and rows per page
 * Recalculates visible rows and renders pagination controls
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
    this.state.currentPage = Math.min(Math.max(1, this.state.currentPage), totalPages);
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
 * Render pagination control buttons
 * Supports ellipsis for large page ranges
 * Uses aria attributes for accessibility
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

    // Create pagination container structure
    const paginationUl = document.createElement('ul');
    paginationUl.className = 'pagination';
    paginationUl.setAttribute('aria-label', 'Pagination'); // Add accessibility label
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
            li.setAttribute('aria-hidden', 'true'); // Hide from screen readers
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
    pageInfoDiv.setAttribute('aria-live', 'polite'); // Make dynamic content accessible
    this.paginationContainer.appendChild(pageInfoDiv);
}

/**
 * Get page numbers for pagination with ellipsis
 * Implements configurable maximum pages to show
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
 * Create a pagination button with appropriate handlers
 * Supports disabling and active states
 * Uses aria attributes for accessibility
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
    button.setAttribute('aria-label', `Go to page ${text}`); // Add specific aria label

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
 * Go to a specific page and update pagination
 * Handles invalid page numbers gracefully
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
    console.log(`📄 Going to page: ${pageNumber}`);
    this.updatePagination();
}

/**
 * Change rows per page and update pagination
 * Handles invalid rows per page values gracefully
 * @param {number} rowsPerPage - New rows per page value
 */
changeRowsPerPage(rowsPerPage) {
    if (isNaN(rowsPerPage) || rowsPerPage < 1) {
        console.warn(`⚠️ Invalid rows per page value: ${rowsPerPage}`);
        return;
    }

    this.state.rowsPerPage = rowsPerPage;
    this.state.currentPage = 1; // Reset to first page
    console.log(`📐 Changed rows per page to: ${rowsPerPage}`);

    // Update select box if available
    if (this.rowsPerPageSelect) {
        this.rowsPerPageSelect.value = rowsPerPage.toString();
    }

    this.saveUserPreferences(); // Store rows per page
    this.updatePagination();
}

/**
 * Debounce function to limit the rate at which a function can fire.
 * @param {Function} func The function to debounce.
 * @param {number} delay The delay in milliseconds.
 * @returns {Function} The debounced function.
 */
debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
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

























     */
    updateResultText(totalPages) {
        if (this.resultContainer && this.state.visibleRowsCount > 0) {
            const searchTerm = this.state.lastSearchTerm;
            const narCategory = this.narFilter.value.toLowerCase();
            const statusFilter = this.statusFilter.value.toLowerCase();
            const totalRows = this.state.visibleRowsCount;

            // Get text from the selected option
            const narCategoryText = narCategory !== 'all' ?
                this.narFilter.options[this.narFilter.selectedIndex].text : '';

            let message = `Showing page ${this.state.currentPage} of ${totalPages} `;

            if(searchTerm || narCategory !== 'all' || statusFilter !== 'all') {
                message = `Found ${totalRows} rows`;
                if (searchTerm) message += ` for "${searchTerm}"`;
                if (narCategory !== 'all') message += ` in category "${narCategoryText}"`;
                if (statusFilter !== 'all') message += ` with status "${statusFilter}"`;
            } else {
                message += `(${totalRows} total rows)`;
            }

            this.resultContainer.textContent = message;
            this.resultContainer.style.display = 'block'; // Ensure it's visible
        } else {
            this.resultContainer.textContent = 'No results found.';
            this.resultContainer.style.display = 'block'; // Still show the message
        }
    }
}

// Initialize handler when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const handler = new XMLTableHandler();
    window.tableHandler = handler;
});