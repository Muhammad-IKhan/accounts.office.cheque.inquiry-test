class XMLTableHandler {
    constructor(options = {}) {
        // Set pagination defaults with configurable options
        this.paginationConfig = {
            minRowsPerPage: options.minRowsPerPage || 5,
            maxRowsPerPage: options.maxRowsPerPage || 50,
            defaultRowsPerPage: options.defaultRowsPerPage || 10,
            paginationSizes: options.paginationSizes || [5, 10, 25, 50],
            showPageNumbers: options.showPageNumbers !== undefined ? options.showPageNumbers : true,
            showFirstLast: options.showFirstLast !== undefined ? options.showFirstLast : true,
            maxPageButtons: options.maxPageButtons || 5
        };
        
        try {
            this.defineColumns();
            this.initializeDOMElements();
            this.initializeState();
            this.initializeEventListeners();
            this.initializePagination();
            
            // Immediately fetch and display data
            this.fetchXMLData().then(() => {
                this.resetTable();
                console.log('✅ Initial data load complete');
            }).catch(error => {
                console.error('❌ Initial data load failed:', error);
                this.showError('Failed to load initial data');
            });
        } catch (error) {
            console.error('❌ Constructor Error:', error.message);
            this.showError('Failed to initialize table handler: ' + error.message);
        }
    }

    defineColumns() {
        this.columns = {
            NARRATION: { 
                index: 0, 
                type: 'string', 
                required: true,
                title: 'Narration'
            },
            AMOUNT: { 
                index: 1, 
                type: 'number', 
                required: true,
                title: 'Amount'
            },
            CHEQ_NO: { 
                index: 2, 
                type: 'number', 
                required: true,
                title: 'Cheque No'
            },
            NAR: { 
                index: 3, 
                type: 'string', 
                required: true,
                title: 'NAR'
            },
            DD: { 
                index: 4, 
                type: 'string', 
                required: true,
                title: 'Status'
            }
        };
    }

    initializeDOMElements() {
        const required_elements = {
            'checksTable': 'tableBody',
            'search': 'searchInput',
            'narCategory': 'narFilter',
            'statusFilter': 'statusFilter',
            'tableContainer': 'tableContainer',
            'emptyState': 'emptyState',
            'result': 'resultContainer',
            'pagination': 'paginationContainer',
            'searchBtn': 'searchBtn'
        };

        for (const [id, prop] of Object.entries(required_elements)) {
            const element = document.getElementById(id);
            if (!element) {
                throw new Error(`Required element #${id} not found in DOM`);
            }
            this[prop] = element;
        }
    }

    initializeState() {
        this.state = {
            enableLiveUpdate: false,
            tableResetEnabled: true,
            backspaceDefault: true,
            xmlData: '',
            lastSearchTerm: '',
            currentStatusFilter: 'all',
            lastFilterCategory: 'all',
            rowsPerPage: this.paginationConfig.defaultRowsPerPage,
            currentPage: 1,
            visibleRowsCount: 0,
            totalPages: 1,
            sortColumn: null,
            sortDirection: 'asc',
            allRows: [], // Store all table rows for pagination
            filteredRows: [] // Store filtered rows for pagination
        };
    }

    initializeEventListeners() {
        // Search events
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
            this.handleBackspace(e);
        });

        this.searchBtn.addEventListener('click', () => this.performSearch());

        // Filter events
        this.narFilter.addEventListener('change', () => this.applyFilters());
        this.statusFilter.addEventListener('change', () => this.applyFilters());

        // Sorting events
        document.querySelectorAll('th[data-column]').forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.column;
                this.sortTable(column);
            });
        });
    }

    initializePagination() {
        // Create pagination container if it doesn't exist
        if (!this.paginationContainer) {
            this.paginationContainer = document.createElement('div');
            this.paginationContainer.id = 'pagination';
            this.paginationContainer.className = 'pagination-container';
            this.tableContainer.parentNode.insertBefore(this.paginationContainer, this.tableContainer.nextSibling);
        }

        // Clear existing pagination
        this.paginationContainer.innerHTML = '';
        
        // Create pagination wrapper
        const paginationWrapper = document.createElement('div');
        paginationWrapper.className = 'pagination-wrapper';
        
        // Create page size selector
        const pageSizeWrapper = document.createElement('div');
        pageSizeWrapper.className = 'page-size-wrapper';
        
        const pageSizeLabel = document.createElement('label');
        pageSizeLabel.textContent = 'Rows per page: ';
        
        const pageSizeSelect = document.createElement('select');
        pageSizeSelect.className = 'page-size-select';
        
        // Add options from configuration
        this.paginationConfig.paginationSizes.forEach(size => {
            if (size >= this.paginationConfig.minRowsPerPage && size <= this.paginationConfig.maxRowsPerPage) {
                const option = document.createElement('option');
                option.value = size;
                option.textContent = size;
                if (size === this.state.rowsPerPage) {
                    option.selected = true;
                }
                pageSizeSelect.appendChild(option);
            }
        });
        
        pageSizeSelect.addEventListener('change', (e) => {
            this.state.rowsPerPage = parseInt(e.target.value);
            this.state.currentPage = 1; // Reset to first page
            this.updatePagination();
            this.renderTable();
        });
        
        pageSizeWrapper.appendChild(pageSizeLabel);
        pageSizeWrapper.appendChild(pageSizeSelect);
        
        // Create pagination controls container
        const paginationControls = document.createElement('div');
        paginationControls.className = 'pagination-controls';
        
        paginationWrapper.appendChild(pageSizeWrapper);
        paginationWrapper.appendChild(paginationControls);
        this.paginationContainer.appendChild(paginationWrapper);
        
        // Store references
        this.pageSizeSelect = pageSizeSelect;
        this.paginationControls = paginationControls;
    }

    updatePagination() {
        if (!this.paginationControls) return;
        
        // Clear existing controls
        this.paginationControls.innerHTML = '';
        
        // Calculate total pages
        const totalItems = this.state.filteredRows.length;
        this.state.totalPages = Math.max(1, Math.ceil(totalItems / this.state.rowsPerPage));
        
        // Ensure current page is valid
        if (this.state.currentPage > this.state.totalPages) {
            this.state.currentPage = this.state.totalPages;
        }
        
        // Create page info display
        const pageInfo = document.createElement('span');
        pageInfo.className = 'page-info';
        const startItem = (this.state.currentPage - 1) * this.state.rowsPerPage + 1;
        const endItem = Math.min(startItem + this.state.rowsPerPage - 1, totalItems);
        pageInfo.textContent = `${startItem}-${endItem} of ${totalItems}`;
        
        // Add first page button
        if (this.paginationConfig.showFirstLast) {
            const firstPageBtn = this.createPaginationButton('«', 1, this.state.currentPage <= 1);
            this.paginationControls.appendChild(firstPageBtn);
        }
        
        // Add previous button
        const prevPageBtn = this.createPaginationButton('‹', this.state.currentPage - 1, this.state.currentPage <= 1);
        this.paginationControls.appendChild(prevPageBtn);
        
        // Add page numbers if enabled
        if (this.paginationConfig.showPageNumbers) {
            this.renderPageNumbers();
        }
        
        // Add next button
        const nextPageBtn = this.createPaginationButton('›', this.state.currentPage + 1, this.state.currentPage >= this.state.totalPages);
        this.paginationControls.appendChild(nextPageBtn);
        
        // Add last page button
        if (this.paginationConfig.showFirstLast) {
            const lastPageBtn = this.createPaginationButton('»', this.state.totalPages, this.state.currentPage >= this.state.totalPages);
            this.paginationControls.appendChild(lastPageBtn);
        }
        
        // Add page info
        this.paginationControls.appendChild(pageInfo);
        
        // Show/hide pagination based on content
        this.paginationContainer.style.display = totalItems <= 0 ? 'none' : 'block';
    }

    renderPageNumbers() {
        const maxButtons = this.paginationConfig.maxPageButtons;
        let startPage = Math.max(1, this.state.currentPage - Math.floor(maxButtons / 2));
        let endPage = startPage + maxButtons - 1;
        
        if (endPage > this.state.totalPages) {
            endPage = this.state.totalPages;
            startPage = Math.max(1, endPage - maxButtons + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = this.createPaginationButton(i.toString(), i, false, i === this.state.currentPage);
            this.paginationControls.appendChild(pageBtn);
        }
    }

    createPaginationButton(text, page, disabled = false, active = false) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = 'pagination-button';
        if (active) button.classList.add('active');
        button.disabled = disabled;
        
        if (!disabled) {
            button.addEventListener('click', () => {
                this.state.currentPage = page;
                this.updatePagination();
                this.renderTable();
            });
        }
        
        return button;
    }

    renderTable() {
        // Get current page data
        const startIndex = (this.state.currentPage - 1) * this.state.rowsPerPage;
        const endIndex = startIndex + this.state.rowsPerPage;
        const currentPageRows = this.state.filteredRows.slice(startIndex, endIndex);
        
        // Clear table body
        this.tableBody.innerHTML = '';
        
        // Populate table with current page data
        currentPageRows.forEach(row => {
            this.tableBody.appendChild(row.cloneNode(true));
        });
        
        // Update visibility
        this.tableContainer.style.display = currentPageRows.length > 0 ? 'block' : 'none';
        this.emptyState.style.display = currentPageRows.length > 0 ? 'none' : 'block';
    }

    handleBackspace(e) {
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
                }
                if (inputAfter.length > 0) {
                    this.state.backspaceDefault = true;
                }
            }, 0);
        }
    }

    async fetchXMLData() {
        try {
            const filesResponse = await fetch('/accounts.office.cheque.inquiry/public/data/files.json');
            if (!filesResponse.ok) throw new Error(`HTTP error! Status: ${filesResponse.status}`);
            const xmlFiles = await filesResponse.json();

            let combinedXML = '<root>';
            for (const file of xmlFiles) {
                const fileResponse = await fetch(`/accounts.office.cheque.inquiry/public/data/${file}`);
                if (!fileResponse.ok) throw new Error(`HTTP error for file: ${file}`);
                let xmlContent = await fileResponse.text();
                xmlContent = xmlContent.replace(/<\?xml[^>]+\?>/, '').replace(/<\/?root>/g, '');
                combinedXML += xmlContent;
            }
            combinedXML += '</root>';

            localStorage.setItem('xmlData', combinedXML);
            this.state.xmlData = combinedXML;
            return this.parseXMLToTable(combinedXML);
        } catch (error) {
            console.error('Error fetching XML:', error);
            const storedXML = localStorage.getItem('xmlData');
            if (storedXML) {
                console.log('Using cached XML data');
                return this.parseXMLToTable(storedXML);
            }
            throw error;
        }
    }

    parseXMLToTable(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString || this.state.xmlData, "text/xml");

        if (xmlDoc.querySelector('parsererror')) {
            throw new Error('XML parsing error: ' + xmlDoc.querySelector('parsererror').textContent);
        }

        const entries = xmlDoc.getElementsByTagName('G_PVN');
        
        // Store all rows
        this.state.allRows = [];
        
        Array.from(entries).forEach((element) => {
            const row = this.createTableRow(element);
            this.state.allRows.push(row);
        });

        // Initialize filtered rows
        this.state.filteredRows = [...this.state.allRows];
        this.state.visibleRowsCount = entries.length;
        
        // Update pagination and render table
        this.updatePagination();
        this.renderTable();
        
        return true;
    }

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

    formatAmount(value) {
        try {
            return parseFloat(value).toLocaleString('en-US');
        } catch {
            console.warn(`Invalid amount value: ${value}`);
            return '0';
        }
    }

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
        return Object.entries(statusMap).find(([key]) => lowerStatus.includes(key))?.[1] || 'status-gray';
    }

    performSearch() {
        const searchTerm = this.searchInput.value.toLowerCase();
        this.state.lastSearchTerm = searchTerm;
        this.applyFilters();
    }

    applyFilters() {
        const searchTerm = this.state.lastSearchTerm;
        const narCategory = this.narFilter.value.toLowerCase();
        const statusFilter = this.statusFilter.value.toLowerCase();

        if (!searchTerm && narCategory === 'all' && statusFilter === 'all') {
            this.state.filteredRows = [...this.state.allRows];
            this.state.currentPage = 1;
            this.updatePagination();
            this.renderTable();
            return;
        }

        // Apply filters to all rows
        this.state.filteredRows = this.state.allRows.filter(row => {
            const narValue = row.getAttribute('data-nar');
            const status = row.querySelector('td[data-field="DD"]').textContent.toLowerCase();
            const cells = Array.from(row.getElementsByTagName('td'));

            const matchesCategory = narCategory === 'all' || narValue === narCategory;
            const matchesStatus = statusFilter === 'all' || status.includes(statusFilter);
            const matchesSearch = !searchTerm || cells.some(cell => 
                cell.textContent.toLowerCase().includes(searchTerm)
            );

            return matchesCategory && matchesStatus && matchesSearch;
        });

        // Reset to first page and update
        this.state.currentPage = 1;
        this.updatePagination();
        this.renderTable();
        
        // Show results message
        this.updateSearchResults(this.state.filteredRows.length);
        this.resultContainer.style.display = 'block';
    }

    updateSearchResults(matchCount) {
        const searchTerm = this.state.lastSearchTerm;
        const narCategory = this.narFilter.value;
        const statusFilter = this.statusFilter.value;

        let message = `Found ${matchCount} results`;
        if (searchTerm) message += ` for "${searchTerm}"`;
        if (narCategory !== 'all') message += ` in category "${this.narFilter.options[this.narFilter.selectedIndex].text}"`;
        if (statusFilter !== 'all') message += ` with status "${statusFilter}"`;

        this.resultContainer.textContent = matchCount > 0 ? message : 'No results found.';
    }

    resetTable() {
        this.searchInput.value = '';
        this.narFilter.value = 'all';
        this.statusFilter.value = 'all';
        this.state.lastSearchTerm = '';
        
        // Reset filtered rows
        this.state.filteredRows = [...this.state.allRows];
        this.state.currentPage = 1;
        
        // Update UI
        this.tableContainer.style.display = 'none';
        this.emptyState.style.display = 'block';
        this.resultContainer.style.display = 'none';
        
        // Update pagination and render table
        this.updatePagination();
        this.renderTable();
    }

    showError(message) {
        console.error('Error:', message);
        this.resultContainer.innerHTML = `
            <div class="alert alert-danger">
                ${message}
            </div>
        `;
        this.resultContainer.style.display = 'block';
    }

    sortTable(column) {
        if (!this.columns[column]) return;

        const direction = this.state.sortColumn === column && this.state.sortDirection === 'asc' ? 'desc' : 'asc';
        const type = this.columns[column].type;

        // Sort all rows
        this.state.allRows.sort((a, b) => {
            const aValue = this.getCellValue(a, column, type);
            const bValue = this.getCellValue(b, column, type);
            
            return direction === 'asc' ? 
                aValue > bValue ? 1 : -1 :
                aValue < bValue ? 1 : -1;
        });
        
        // Sort filtered rows
        this.state.filteredRows.sort((a, b) => {
            const aValue = this.getCellValue(a, column, type);
            const bValue = this.getCellValue(b, column, type);
            
            return direction === 'asc' ? 
                aValue > bValue ? 1 : -1 :
                aValue < bValue ? 1 : -1;
        });

        this.updateSortIndicators(column, direction);
        
        // Re-render table with sorted data
        this.renderTable();
        
        this.state.sortColumn = column;
        this.state.sortDirection = direction;
    }

    getCellValue(row, column, type) {
        const cell = row.querySelector(`td[data-field="${column}"]`);
        const value = cell.textContent.trim();
        return type === 'number' ? parseFloat(value.replace(/,/g, '')) || 0 : value.toLowerCase();
    }

    updateSortIndicators(column, direction) {
        document.querySelectorAll('th[data-column] .sort-icon').forEach(icon => {
            icon.textContent = '';
        });

        const currentHeader = document.querySelector(`th[data-column="${column}"]`);
        const sortIcon = currentHeader.querySelector('.sort-icon');
        sortIcon.textContent = direction === 'asc' ? ' ↑' : ' ↓';
    }
}

// Initialize handler
document.addEventListener('DOMContentLoaded', () => {
    // console.log('🌟 DOM Content Loaded - Starting initialization');
    
    try {
        window.tableHandler = new XMLTableHandler({
            minRowsPerPage: 5,     // Minimum rows per page
            maxRowsPerPage: 100,   // Maximum rows per page
            defaultRowsPerPage: 10, // Default rows per page
            paginationSizes: [5, 10, 25, 50, 100], // Available page sizes
            showPageNumbers: true,  // Show page number buttons
            showFirstLast: true,    // Show first/last page buttons
            maxPageButtons: 5       // Maximum number of page buttons to show
        });
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger mt-3';
        errorDiv.innerHTML = `Failed to initialize table handler: ${error.message}`;
        document.body.insertBefore(errorDiv, document.body.firstChild);
    }
});

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/accounts.office.cheque.inquiry/service-worker.js', { scope: '/accounts.office.cheque.inquiry/' })
            // .then(registration => console.log('ServiceWorker registered:', registration.scope))
            .catch(err => console.error('ServiceWorker registration failed:', err));
    });
}
