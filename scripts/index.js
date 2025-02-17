class XMLTableHandler {
    constructor() {
        console.log('🚀 Initializing XMLTableHandler...');
        
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
            rowsPerPage: 10,
            currentPage: 1,
            totalRows: 0,
            filteredRows: [],
            sortColumn: null,
            sortDirection: 'asc'
        };
    }

    initializeEventListeners() {
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
            this.handleBackspace(e);
        });

        this.searchBtn.addEventListener('click', () => this.performSearch());
        this.narFilter.addEventListener('change', () => this.applyFilters());
        this.statusFilter.addEventListener('change', () => this.applyFilters());

        document.querySelectorAll('th[data-column]').forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.column;
                this.sortTable(column);
            });
        });
    }

    updatePagination() {
        const totalPages = Math.ceil(this.state.filteredRows.length / this.state.rowsPerPage);
        this.paginationContainer.innerHTML = '';

        if (totalPages <= 1) {
            this.paginationContainer.style.display = 'none';
            return;
        }

        this.paginationContainer.style.display = 'block';
        
        // Previous button
        const prevBtn = this.createPaginationButton('Previous', this.state.currentPage > 1);
        prevBtn.addEventListener('click', () => this.changePage(this.state.currentPage - 1));
        this.paginationContainer.appendChild(prevBtn);

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = this.createPaginationButton(i.toString(), true, i === this.state.currentPage);
            pageBtn.addEventListener('click', () => this.changePage(i));
            this.paginationContainer.appendChild(pageBtn);
        }

        // Next button
        const nextBtn = this.createPaginationButton('Next', this.state.currentPage < totalPages);
        nextBtn.addEventListener('click', () => this.changePage(this.state.currentPage + 1));
        this.paginationContainer.appendChild(nextBtn);
    }

    createPaginationButton(text, enabled, active = false) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = `pagination-btn ${active ? 'active' : ''} ${enabled ? '' : 'disabled'}`;
        button.disabled = !enabled;
        return button;
    }

    changePage(page) {
        this.state.currentPage = page;
        this.displayCurrentPage();
        this.updatePagination();
    }

    displayCurrentPage() {
        const start = (this.state.currentPage - 1) * this.state.rowsPerPage;
        const end = start + this.state.rowsPerPage;
        const pageRows = this.state.filteredRows.slice(start, end);

        Array.from(this.tableBody.getElementsByTagName('tr')).forEach(row => {
            row.style.display = 'none';
        });

        pageRows.forEach(row => {
            row.style.display = '';
        });
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
            this.resetTable();
            return;
        }

        this.tableContainer.style.display = 'block';
        this.emptyState.style.display = 'none';
        this.resultContainer.style.display = 'block';

        this.state.filteredRows = Array.from(this.tableBody.querySelectorAll('tr')).filter(row => {
            const narValue = row.getAttribute('data-nar');
            const status = row.querySelector('td[data-field="DD"]').textContent.toLowerCase();
            const narrationCell = row.querySelector('td[data-field="NARRATION"]');
            
            const matchesCategory = narCategory === 'all' || narValue === narCategory;
            const matchesStatus = statusFilter === 'all' || status.includes(statusFilter);
            const matchesSearch = !searchTerm || 
                                (narrationCell && narrationCell.textContent.toLowerCase().includes(searchTerm));

            return matchesCategory && matchesStatus && matchesSearch;
        });

        this.state.currentPage = 1;
        this.updateSearchResults(this.state.filteredRows.length);
        this.displayCurrentPage();
        this.updatePagination();
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
        
        this.tableContainer.style.display = 'none';
        this.emptyState.style.display = 'block';
        this.resultContainer.style.display = 'none';
        
        this.state.filteredRows = Array.from(this.tableBody.getElementsByTagName('tr'));
        this.state.currentPage = 1;
        this.displayCurrentPage();
        this.updatePagination();
    }

    // ... (rest of the existing methods remain the same)
}

// Initialize handler
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌟 DOM Content Loaded - Starting initialization');
    
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
