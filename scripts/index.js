/**
 * XMLTableHandler Class
 * @author Muhammad-IKhan
 * @lastUpdated 2025-02-15 16:52:13
 */
class XMLTableHandler {
    /**
     * @throws {Error} If required DOM elements are not found
     */
    constructor() {
        console.log('[XMLTableHandler] Initialization starting...', {
            timestamp: new Date().toISOString(),
            user: 'Muhammad-IKhan'
        });

        // Initialize with validation
        this.initializeDOMElements();
        this.initializeState();
        this.initializeEventListeners();
    }

    /**
     * Initialize and validate DOM elements
     * @private
     * @throws {Error} If required elements are not found
     */
    initializeDOMElements() {
        const requiredElements = {
            tableBody: 'checksTable',
            searchInput: 'search',
            narFilter: 'narCategory',
            tableContainer: 'tableContainer',
            emptyState: 'emptyState',
            resultContainer: 'result'
        };

        for (const [key, id] of Object.entries(requiredElements)) {
            const element = document.getElementById(id);
            if (!element) {
                const error = `Required DOM element '${id}' not found`;
                console.error('[XMLTableHandler]', error);
                throw new Error(error);
            }
            this[key] = element;
        }
    }

    /**
     * Initialize state and configuration
     * @private
     */
    initializeState() {
        // Column definitions with metadata
        this.columns = {
            NARRATION: { index: 0, type: 'string', sortable: true },
            AMOUNT: { 
                index: 1, 
                type: 'number',
                sortable: true,
                formatter: (value) => parseFloat(value.replace(/,/g, '')) || 0
            },
            CHEQ_NO: { 
                index: 2, 
                type: 'number',
                sortable: true,
                formatter: (value) => parseInt(value, 10) || 0
            },
            NAR: { index: 3, type: 'string', sortable: true },
            DD: { 
                index: 4, 
                type: 'string', 
                sortable: true,
                statusMapping: {
                    'despatched through gpo': 'status-orange',
                    'ready but not signed': 'status-green',
                    'cheque ready': 'status-green',
                    'despatched to lakki camp': 'status-red',
                    'sent to chairman': 'status-blue'
                }
            }
        };

        // Search state
        this.searchState = {
            debounceTimer: null,
            debounceDelay: 300,
            lastQuery: '',
            lastCategory: 'all'
        };

        // Cache for improved performance
        this.cache = {
            rows: new WeakMap(),
            sortedData: null,
            filteredData: null
        };

        // Sort state
        this.sortState = {
            column: null,
            direction: 'asc'
        };
    }

    /**
     * Setup event listeners with debouncing and error handling
     * @private
     */
    initializeEventListeners() {
        // Search input with debouncing
        this.searchInput.addEventListener('input', () => {
            clearTimeout(this.searchState.debounceTimer);
            this.searchState.debounceTimer = setTimeout(() => {
                this.performSearch();
            }, this.searchState.debounceDelay);
        });

        // NAR filter with performance optimization
        this.narFilter.addEventListener('change', () => {
            this.performFilteredSearch();
        });

        // Add sort listeners
        this.initializeSortListeners();
    }

    /**
     * Perform search with category filtering
     * @private
     */
    performSearch() {
        console.log('[Search] Starting search operation', {
            timestamp: new Date().toISOString(),
            searchTerm: this.searchInput.value,
            category: this.narFilter.value
        });

        try {
            const searchTerm = this.searchInput.value.toLowerCase().trim();
            const category = this.narFilter.value.toLowerCase();

            // Cache check
            const cacheKey = `${searchTerm}-${category}`;
            if (this.cache.filteredData && this.cache.filteredData.key === cacheKey) {
                this.displayCachedResults();
                return;
            }

            const results = this.filterRows(searchTerm, category);
            this.updateUIWithResults(results);

        } catch (error) {
            console.error('[Search] Error during search:', error);
            this.showError('Search operation failed. Please try again.');
        }
    }

    /**
     * Filter table rows based on search term and category
     * @private
     * @param {string} searchTerm 
     * @param {string} category 
     * @returns {Array} Filtered rows
     */
    filterRows(searchTerm, category) {
        const rows = Array.from(this.tableBody.getElementsByTagName('tr'));
        const results = [];

        for (const row of rows) {
            const narValue = row.getAttribute('data-nar')?.toLowerCase();
            
            // Category check
            if (category !== 'all' && (!narValue || !narValue.includes(category))) {
                continue;
            }

            // Search term check
            if (searchTerm && !this.rowMatchesSearch(row, searchTerm)) {
                continue;
            }

            results.push(row);
        }

        // Cache results
        this.cache.filteredData = {
            key: `${searchTerm}-${category}`,
            results: results
        };

        return results;
    }

    /**
     * Check if a row matches the search term
     * @private
     * @param {HTMLElement} row 
     * @param {string} searchTerm 
     * @returns {boolean}
     */
    rowMatchesSearch(row, searchTerm) {
        if (this.cache.rows.has(row)) {
            const cachedText = this.cache.rows.get(row);
            return cachedText.includes(searchTerm);
        }

        const text = Array.from(row.getElementsByTagName('td'))
            .map(cell => cell.textContent.toLowerCase())
            .join(' ');
        
        this.cache.rows.set(row, text);
        return text.includes(searchTerm);
    }

    /**
     * Fetch XML data with retry mechanism
     * @public
     * @returns {Promise<boolean>}
     */
    async fetchXMLData() {
        const MAX_RETRIES = 3;
        const TIMEOUT = 5000;
        let retries = 0;

        while (retries < MAX_RETRIES) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

                const filesResponse = await fetch(
                    '/accounts.office.cheque.inquiry/public/data/files.json',
                    { signal: controller.signal }
                );

                clearTimeout(timeoutId);

                if (!filesResponse.ok) {
                    throw new Error(`HTTP error! Status: ${filesResponse.status}`);
                }

                const xmlFiles = await filesResponse.json();
                await this.processXMLFiles(xmlFiles);
                return true;

            } catch (error) {
                console.error(`[XMLTableHandler] Fetch attempt ${retries + 1} failed:`, error);
                retries++;

                if (retries === MAX_RETRIES) {
                    this.handleFetchError(error);
                    return false;
                }

                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
            }
        }
    }

    /**
     * Handle fetch errors with fallback
     * @private
     * @param {Error} error 
     */
    handleFetchError(error) {
        console.error('[XMLTableHandler] All fetch attempts failed:', error);
        
        const storedXML = localStorage.getItem('xmlData');
        if (storedXML) {
            console.log('[XMLTableHandler] Using cached XML data');
            this.parseXMLToTable(storedXML);
        } else {
            this.showError('Failed to load data. Please check your connection and try again.');
        }
    }
}

// Initialize with error handling
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('[Init] Starting application initialization', {
            timestamp: new Date().toISOString(),
            user: 'Muhammad-IKhan'
        });

        const handler = new XMLTableHandler();
        handler.fetchXMLData()
            .then(success => {
                if (success) {
                    console.log('[Init] Application initialized successfully');
                } else {
                    console.error('[Init] Application initialization failed');
                }
            })
            .catch(error => {
                console.error('[Init] Critical error during initialization:', error);
            });

    } catch (error) {
        console.error('[Init] Fatal error:', error);
        document.body.innerHTML = '<div class="error">Application failed to load. Please refresh the page.</div>';
    }
});
