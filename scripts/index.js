class XMLTableHandler {
    constructor() {
        console.log('🚀 Initializing XMLTableHandler with pagination and search restriction...');
        
        try {
            this.defineColumns();
            this.initializeDOMElements();
            this.initializeState();
            this.initializeEventListeners();
            
            this.fetchXMLData().then(() => {
                this.resetTable();
                this.updatePagination();
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
        console.log('📊 Defining table columns...');
        this.columns = {
            NARRATION: { 
                index: 0, 
                type: 'string', 
                required: true,
                title: 'Narration',
                searchable: true
            },
            AMOUNT: { 
                index: 1, 
                type: 'number', 
                required: true,
                title: 'Amount',
                searchable: false
            },
            CHEQ_NO: { 
                index: 2, 
                type: 'number', 
                required: true,
                title: 'Cheque No',
                searchable: false
            },
            NAR: { 
                index: 3, 
                type: 'string', 
                required: true,
                title: 'NAR',
                searchable: true
            },
            DD: { 
                index: 4, 
                type: 'string', 
                required: true,
                title: 'Status',
                searchable: false
            }
        };
    }

    // initializeDOMElements() {
    //     console.log('🔍 Initializing DOM elements...');
    //     const required_elements = {
    //         'checksTable': 'tableBody',
    //         'search': 'searchInput',
    //         'narCategory': 'narFilter',
    //         'statusFilter': 'statusFilter',
    //         'tableContainer': 'tableContainer',
    //         'emptyState': 'emptyState',
    //         'result': 'resultContainer',
    //         'pagination': 'paginationContainer',
    //         'searchBtn': 'searchBtn',
    //         'rowsPerPageSelect': 'rowsPerPage'
    //     };

    //     for (const [id, prop] of Object.entries(required_elements)) {
    //         const element = document.getElementById(id);
    //         if (!element) {
    //             throw new Error(`Required element #${id} not found in DOM`);
    //         }
    //         this[prop] = element;
    //     }
    // }
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
        'pagination': 'paginationContainer',
        'searchBtn': 'searchBtn',
        'rowsPerPage': 'rowsPerPage'  // Changed from 'rowsPerPageSelect' to match HTML
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
        console.log('💾 Initializing application state...');
        this.state = {
            enableLiveUpdate: false,
            tableResetEnabled: true,
            backspaceDefault: true,
            xmlData: '',
            lastSearchTerm: '',
            currentStatusFilter: 'all',
            lastFilterCategory: 'all',
            rowsPerPage: parseInt(this.rowsPerPage?.value || '10'),
            currentPage: 1,
            totalRows: 0,
            visibleRows: [],
            sortColumn: null,
            sortDirection: 'asc'
        };
    }

    initializeEventListeners() {
        console.log('👂 Setting up event listeners...');
        
        // Search events with restriction
        this.searchInput.addEventListener('input', () => {
            const searchTerm = this.searchInput.value.toLowerCase();
            if (searchTerm.length >= 3 || searchTerm.length === 0) {
                this.state.lastSearchTerm = searchTerm;
                this.performSearch();
            }
        });

        this.searchBtn.addEventListener('click', () => {
            const searchTerm = this.searchInput.value.toLowerCase();
            if (searchTerm.length >= 3 || searchTerm.length === 0) {
                this.performSearch();
            } else {
                this.showError('Please enter at least 3 characters to search');
            }
        });

        // Pagination events
        this.rowsPerPage.addEventListener('change', () => {
            console.log('📄 Rows per page changed:', this.rowsPerPage.value);
            this.state.rowsPerPage = parseInt(this.rowsPerPage.value);
            this.state.currentPage = 1;
            this.applyFilters();
        });

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

    async fetchXMLData() {
        console.log('📡 Fetching XML data...');
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
            console.error('❌ Error fetching XML:', error);
            const storedXML = localStorage.getItem('xmlData');
            if (storedXML) {
                console.log('📦 Using cached XML data');
                return this.parseXMLToTable(storedXML);
            }
            throw error;
        }
    }

    parseXMLToTable(xmlString) {
        console.log('🔄 Parsing XML to table...');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString || this.state.xmlData, "text/xml");

        if (xmlDoc.querySelector('parsererror')) {
            throw new Error('XML parsing error: ' + xmlDoc.querySelector('parsererror').textContent);
        }

        const entries = xmlDoc.getElementsByTagName('G_PVN');
        this.tableBody.innerHTML = '';
        this.state.totalRows = entries.length;

        Array.from(entries).forEach((element) => {
            const row = this.createTableRow(element);
            this.tableBody.appendChild(row);
        });

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

    performSearch() {
        console.log('🔍 Performing search...');
        const searchTerm = this.searchInput.value.toLowerCase();
        
        if (searchTerm.length > 0 && searchTerm.length < 3) {
            this.showError('Please enter at least 3 characters to search');
            return;
        }

        this.state.lastSearchTerm = searchTerm;
        this.state.currentPage = 1;
        this.applyFilters();
    }

    applyFilters() {
        console.log('🎯 Applying filters...');
        const searchTerm = this.state.lastSearchTerm;
        const narCategory = this.narFilter.value.toLowerCase();
        const statusFilter = this.statusFilter.value.toLowerCase();

        if (!searchTerm && narCategory === 'all' && statusFilter === 'all') {
            return this.resetTable();
        }

        this.tableContainer.style.display = 'block';
        this.emptyState.style.display = 'none';
        this.resultContainer.style.display = 'block';

        let matchingRows = [];
        this.tableBody.querySelectorAll('tr').forEach(row => {
            const narValue = row.getAttribute('data-nar');
            const status = row.querySelector('td[data-field="DD"]').textContent.toLowerCase();
            const cells = Array.from(row.getElementsByTagName('td'));

            const matchesCategory = narCategory === 'all' || narValue === narCategory;
            const matchesStatus = statusFilter === 'all' || status.includes(statusFilter);
            const matchesSearch = !searchTerm || cells.some((cell, index) => {
                const column = Object.values(this.columns)[index];
                return column.searchable && cell.textContent.toLowerCase().includes(searchTerm);
            });

            const visible = matchesCategory && matchesStatus && matchesSearch;
            if (visible) {
                matchingRows.push(row);
            }
            row.style.display = 'none'; // Hide all rows initially
        });

        this.state.visibleRows = matchingRows;
        this.updatePagination();
        this.updateSearchResults(matchingRows.length);
    }

    updatePagination() {
        console.log('📑 Updating pagination...');
        const totalRows = this.state.visibleRows.length;
        const totalPages = Math.ceil(totalRows / this.state.rowsPerPage);
        
        // Adjust current page if it exceeds total pages
        if (this.state.currentPage > totalPages) {
            this.state.currentPage = totalPages || 1;
        }

        // Calculate visible rows for current page
        const startIndex = (this.state.currentPage - 1) * this.state.rowsPerPage;
        const endIndex = Math.min(startIndex + this.state.rowsPerPage, totalRows);

        // Hide all rows first
        this.tableBody.querySelectorAll('tr').forEach(row => row.style.display = 'none');

        // Show only rows for current page
        for (let i = startIndex; i < endIndex; i++) {
            this.state.visibleRows[i].style.display = '';
        }

        // Update pagination controls
        this.updatePaginationControls(totalPages, totalRows);
    }

    updatePaginationControls(totalPages, totalRows) {
        console.log('🎛️ Updating pagination controls...');
        const paginationHTML = `
            <div class="pagination-info">
                Showing ${Math.min(totalRows, 1 + (this.state.currentPage - 1) * this.state.rowsPerPage)}-${Math.min(totalRows, this.state.currentPage * this.state.rowsPerPage)} of ${totalRows} entries
            </div>
            <div class="pagination-controls">
                ${this.generatePaginationButtons(totalPages)}
            </div>
        `;

        this.paginationContainer.innerHTML = paginationHTML;

        // Add event listeners to pagination buttons
        this.paginationContainer.querySelectorAll('.page-btn').forEach(button => {
            button.addEventListener('click', () => {
                const newPage = parseInt(button.dataset.page);
                if (newPage !== this.state.currentPage) {
                    this.state.currentPage = newPage;
                    this.updatePagination();
                }
            });
        });
    }

    generatePaginationButtons(totalPages) {
        let buttons = [];
        const currentPage = this.state.currentPage;

        // Previous button
        buttons.push(`
            <button class="page-btn" data-page="${Math.max(1, currentPage - 1)}"
                    ${currentPage === 1 ? 'disabled' : ''}>
                Previous
            </button>
        `);

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                buttons.push(`
                    <button class="page-btn ${i === currentPage ? 'active' : ''}"
                            data-page="${i}">
                        ${i}
                    </button>
                `);
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                buttons.push('<span class="page-ellipsis">...</span>');
            }
        }

        // Next button
        buttons.push(`
            <button class="page-btn" data-page="${Math.min(totalPages, currentPage + 1)}"
                    ${currentPage === totalPages ? 'disabled' : ''}>
                Next
            </button>
        `);

        return buttons.join('');
    }

    updateSearchResults(matchCount) {
        console.log('📊 Updating search results display...');
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
        console.log('🔄 Resetting table to initial state...');
        this.searchInput.value = '';
        this.narFilter.value = 'all';
        this.statusFilter.value = 'all';
        this.state.lastSearchTerm = '';
        this.state.currentPage = 1;
        
        this.tableContainer.style.display = 'none';
        this.emptyState.style.display = 'block';
        this.resultContainer.style.display = 'none';
        
        // Show all rows and update pagination
        this.state.visibleRows = Array.from(this.tableBody.querySelectorAll('tr'));
        this.state.visibleRows.forEach(row => row.style.display = '');
        this.updatePagination();
    }

    sortTable(column) {
        console.log('📑 Sorting table by column:', column);
        if (!this.columns[column]) return;

        const direction = this.state.sortColumn === column && this.state.sortDirection === 'asc' ? 'desc' : 'asc';

        const type = this.columns[column].type;

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

        // Re-apply filters and pagination after sorting
        this.applyFilters();
    }

    getCellValue(row, column, type) {
        const cell = row.querySelector(`td[data-field="${column}"]`);
        const value = cell.textContent.trim();
        return type === 'number' ? parseFloat(value.replace(/,/g, '')) || 0 : value.toLowerCase();
    }

    updateSortIndicators(column, direction) {
        console.log('🔄 Updating sort indicators for column:', column);
        document.querySelectorAll('th[data-column] .sort-icon').forEach(icon => {
            icon.textContent = '';
        });

        const currentHeader = document.querySelector(`th[data-column="${column}"]`);
        const sortIcon = currentHeader.querySelector('.sort-icon');
        sortIcon.textContent = direction === 'asc' ? ' ↑' : ' ↓';
    }

    reorderRows(rows) {
        console.log('🔄 Reordering table rows...');
        this.tableBody.innerHTML = '';
        rows.forEach(row => this.tableBody.appendChild(row));
    }

    formatAmount(value) {
        try {
            return parseFloat(value).toLocaleString('en-US');
        } catch {
            console.warn(`⚠️ Invalid amount value: ${value}`);
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

    showError(message) {
        console.error('❌ Error:', message);
        this.resultContainer.innerHTML = `
            <div class="alert alert-danger">
                ${message}
            </div>
        `;
        this.resultContainer.style.display = 'block';
    }
}

// Initialize handler
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌟 DOM Content Loaded - Starting initialization');
    
    try {
        window.tableHandler = new XMLTableHandler();
        console.log('✅ Table handler initialized successfully');
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
            .then(registration => console.log('✅ ServiceWorker registered:', registration.scope))
            .catch(err => console.error('❌ ServiceWorker registration failed:', err));
    });
}





















