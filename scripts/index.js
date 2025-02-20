//  PAGINATION remains
class XMLTableHandler {
    constructor() {
        // console.log('🚀 Initializing XMLTableHandler...');
        
        try {
            this.defineColumns();
            this.initializeDOMElements();
            this.initializeState();
            this.initializeEventListeners();
            
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
                searchable: false
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
            'searchBtn': 'searchBtn',
            'rowsPerPage': 'rowsPerPageSelect' 
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
            paginationEnabled: true,
            rowsPerPage: 5,
            currentPage: 1,
            visibleRowsCount: 0,
            sortColumn: null,
            sortDirection: 'asc'
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
  //initializePagination
    initializePagination() {
        console.log('🔢 Initializing pagination controls...');
    
        // Add rows per page change listener
        this.rowsPerPageSelect.addEventListener('change', () => {
            console.log(`📊 Rows per page changed to ${this.rowsPerPageSelect.value}`);
            this.state.rowsPerPage = parseInt(this.rowsPerPageSelect.value);
            this.state.currentPage = 1; // Reset to the first page
            this.updatePagination();
        });
    
        // Initial pagination render
        this.updatePagination();
    }
    updatePagination() {
        if (!this.state.paginationEnabled) return;
    
        console.log('🔄 Updating pagination...');
    
        // Get all visible rows (after filtering)
        const visibleRows = Array.from(this.tableBody.querySelectorAll('tr'))
            .filter(row => row.style.display !== 'none');
    
        // Calculate total pages
        const totalPages = Math.ceil(visibleRows.length / this.state.rowsPerPage);
        this.state.currentPage = Math.min(this.state.currentPage, totalPages);
    
        // Update row visibility based on current page
        const startIndex = (this.state.currentPage - 1) * this.state.rowsPerPage;
        const endIndex = startIndex + this.state.rowsPerPage;
    
        visibleRows.forEach((row, index) => {
            row.style.display = (index >= startIndex && index < endIndex) ? '' : 'none';
        });
    
        // Render pagination controls (Previous and Next buttons)
        this.renderPaginationControls(totalPages);
        console.log(`📄 Page ${this.state.currentPage} of ${totalPages} displayed`);
    }
    renderPaginationControls(totalPages) {
        const controls = this.paginationContainer;
        controls.innerHTML = ''; // Clear existing controls
    
        if (totalPages <= 1) {
            controls.style.display = 'none'; // Hide pagination if there's only one page
            return;
        }
    
        controls.style.display = 'flex'; // Show pagination controls
    
        // Previous Button
        this.createPaginationButton('Previous', () => {
            if (this.state.currentPage > 1) {
                this.state.currentPage--;
                this.updatePagination();
            }
        }, this.state.currentPage === 1); // Disable if on the first page
    
        // Next Button
        this.createPaginationButton('Next', () => {
            if (this.state.currentPage < totalPages) {
                this.state.currentPage++;
                this.updatePagination();
            }
        }, this.state.currentPage === totalPages); // Disable if on the last page
    }
    createPaginationButton(text, onClick, disabled = false) {
        const button = document.createElement('button');
        button.className = `page-btn${disabled ? ' disabled' : ''}`;
        button.textContent = text;
        button.disabled = disabled;
        button.addEventListener('click', onClick);
        this.paginationContainer.appendChild(button);
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
            this.initializePagination(); 
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
        this.tableBody.innerHTML = '';

        Array.from(entries).forEach((element) => {
            const row = this.createTableRow(element);
            this.tableBody.appendChild(row);
        });

        this.state.visibleRowsCount = entries.length;
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

        // Reset pagination to the first page
        this.state.currentPage = 1;
    
        // Reset if no filters are applied
        if (!searchTerm && narCategory === 'all' && statusFilter === 'all') {
            return this.resetTable();
        }
    
        // Show table and hide empty state
        this.tableContainer.style.display = 'block';
        this.emptyState.style.display = 'none';
        this.resultContainer.style.display = 'block';
    
        let matchCount = 0;
    
        this.tableBody.querySelectorAll('tr').forEach(row => {
            const narValue = row.getAttribute('data-nar');
            const status = row.querySelector('td[data-field="DD"]').textContent.toLowerCase();
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
    
            // Determine visibility
            const visible = matchesCategory && matchesStatus && matchesSearch;
            row.style.display = visible ? '' : 'none';
            
            if (visible) matchCount++;
        });
    
        this.updateSearchResults(matchCount);
        this.updatePagination(); // Update pagination after filtering
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
        // Hide pagination if no results
        if (matchCount === 0) {
            this.paginationContainer.style.display = 'none';
        }
    }

    resetTable() {
        this.searchInput.value = '';
        this.narFilter.value = 'all';
        this.statusFilter.value = 'all';
        this.state.lastSearchTerm = '';
        this.state.currentPage = 1; // Reset to the first page
        
        this.tableContainer.style.display = 'none';
        this.emptyState.style.display = 'block';
        this.resultContainer.style.display = 'none';
        
        this.tableBody.querySelectorAll('tr').forEach(row => row.style.display = '');
        this.updatePagination(); // Update pagination after reset
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

    reorderRows(rows) {
        this.tableBody.innerHTML = '';
        rows.forEach(row => this.tableBody.appendChild(row));
    }
}

// Initialize handler
document.addEventListener('DOMContentLoaded', () => {
    // console.log('🌟 DOM Content Loaded - Starting initialization');
    
    try {
        window.tableHandler = new XMLTableHandler();
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
