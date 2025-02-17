/**
 * XMLTableHandler - Handles XML data display and manipulation in tabular format
 * with improved error handling, performance optimizations, and robust data management
 */
class XMLTableHandler {
    constructor() {
        console.log('🚀 Initializing XMLTableHandler...');
        
        try {
            this.defineColumns();
            this.initializeDOMElements();
            this.initializeState();
            this.initializeEventListeners();
            this.initializePagination();
            
            // Initial data load with retry mechanism
            this.fetchXMLData()
                .then(() => {
                    this.resetTable();
                    console.log('✅ Initial data load complete');
                })
                .catch(error => {
                    console.error('❌ Initial data load failed:', error);
                    this.retryFetchData(3);
                    this.showError('Failed to load initial data. Retrying...');
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
            'paginationContainer': 'paginationContainer',
            'searchBtn': 'searchBtn',
            'rowsPerPage': 'rowsPerPage'
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
            visibleRowsCount: 0,
            sortColumn: null,
            sortDirection: 'asc'
        };
    }

    initializeEventListeners() {
        // Remove existing listeners if they exist
        if (this.boundHandleSearch) {
            this.searchInput.removeEventListener('keydown', this.boundHandleSearch);
        }

        // Bind event handlers
        this.boundHandleSearch = (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
            this.handleBackspace(e);
        };

        // Add new listeners with debouncing
        this.searchInput.addEventListener('keydown', this.boundHandleSearch);
        this.searchBtn.addEventListener('click', () => this.performSearch());
        this.narFilter.addEventListener('change', () => this.applyFilters());
        this.statusFilter.addEventListener('change', () => this.applyFilters());

        // Sorting events with debouncing
        document.querySelectorAll('th[data-column]').forEach(header => {
            header.addEventListener('click', this.debounce(() => {
                const column = header.dataset.column;
                this.sortTable(column);
            }, 250));
        });
    }

    async retryFetchData(attempts) {
        while (attempts > 0) {
            try {
                await new Promise(resolve => setTimeout(resolve, 2000));
                await this.fetchXMLData();
                console.log('✅ Data load successful after retry');
                this.resetTable();
                return;
            } catch (error) {
                attempts--;
                console.error(`❌ Retry failed. ${attempts} attempts remaining:`, error);
            }
        }
        this.showError('Failed to load data after multiple attempts');
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
        if (!xmlString) {
            throw new Error('No XML data provided');
        }

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");

        if (xmlDoc.querySelector('parsererror')) {
            throw new Error('XML parsing error: ' + xmlDoc.querySelector('parsererror').textContent);
        }

        const entries = xmlDoc.getElementsByTagName('G_PVN');
        if (!entries || entries.length === 0) {
            console.warn('No entries found in XML data');
            this.showError('No data entries found');
            return false;
        }

        this.tableBody.innerHTML = '';
        Array.from(entries).forEach((element) => {
            const row = this.createTableRow(element);
            this.tableBody.appendChild(row);
        });

        this.state.visibleRowsCount = entries.length;
        this.updatePagination();
        this.renderTableRows();
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
        if (!value || typeof value !== 'string') {
            console.warn(`Invalid amount value: ${value}`);
            return '0';
        }
        try {
            const cleanValue = value.replace(/[^\d.-]/g, '');
            return parseFloat(cleanValue).toLocaleString('en-US');
        } catch (error) {
            console.warn(`Error formatting amount: ${value}`, error);
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
            return this.resetTable();
        }

        this.tableContainer.style.display = 'block';
        this.emptyState.style.display = 'none';
        this.resultContainer.style.display = 'block';

        let matchCount = 0;
        this.tableBody.querySelectorAll('tr').forEach(row => {
            const narValue = row.getAttribute('data-nar');
            const status = row.querySelector('td[data-field="DD"]').textContent.toLowerCase();
            const cells = Array.from(row.getElementsByTagName('td'));

            const matchesCategory = narCategory === 'all' || narValue === narCategory;
            const matchesStatus = statusFilter === 'all' || status.includes(statusFilter);
            const matchesSearch = !searchTerm || cells.some(cell => {
                const field = cell.getAttribute('data-field');
                const columnConfig = this.columns[field];
                return columnConfig.searchable && cell.textContent.toLowerCase().includes(searchTerm);
            });

            const visible = matchesCategory && matchesStatus && matchesSearch;
            row.style.display = visible ? '' : 'none';
            if (visible) matchCount++;
        });

        this.updateSearchResults(matchCount);
        this.updatePagination();
        this.renderTableRows();
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
        
        this.tableBody.querySelectorAll('tr').forEach(row => row.style.display = '');
        this.updatePagination();
        this.renderTableRows();
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
        this.renderTableRows();
    }

    initializePagination() {
        this.rowsPerPage.addEventListener('change', () => {
            const newValue = parseInt(this.rowsPerPage.value, 10);
            // Validate rows per page value
            if (isNaN(newValue) || newValue < 1) {
                console.warn('Invalid rows per page value:', this.rowsPerPage.value);
                this.rowsPerPage.value = 10;
                this.state.rowsPerPage = 10;
            } else {
                this.state.rowsPerPage = newValue;
            }
            this.state.currentPage = 1;
            this.updatePagination();
            this.renderTableRows();
        });

        this.updatePagination();
    }

    updatePagination() {
        const visibleRows = Array.from(this.tableBody.querySelectorAll('tr'))
            .filter(row => row.style.display !== 'none').length;
        const totalPages = Math.ceil(visibleRows / this.state.rowsPerPage);
        const paginationContainer = this.paginationContainer;
        paginationContainer.innerHTML = '';

        if (totalPages <= 1) return;

        const createButton = (text, page, isActive = false, isDisabled = false) => {
            const button = document.createElement('button');
            button.className = `page-btn ${isActive ? 'active' : ''}`;
            button.textContent = text;
            button.disabled = isDisabled;
            button.addEventListener('click', () => {
                this.state.currentPage = page;
                this.renderTableRows();
                this.updatePagination();
            });
            return button;
        };

        // Previous Button
        paginationContainer.appendChild(createButton('Previous', this.state.currentPage - 1, false, this.state.currentPage === 1));

        // Page Numbers with Ellipsis
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || Math.abs(this.state.currentPage - i) <= 2) {
                paginationContainer.appendChild(createButton(i, i, i === this.state.currentPage));
            } else if (Math.abs(this.state.currentPage - i) === 3) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'page-ellipsis';
                ellipsis.textContent = '...';
                paginationContainer.appendChild(ellipsis);
            }
        }

        // Next Button
        paginationContainer.appendChild(createButton('Next', this.state.currentPage + 1, false, this.state.currentPage === totalPages));
    }

    renderTableRows() {
        const visibleRows = Array.from(this.tableBody.querySelectorAll('tr'))
            .filter(row => row.style.display !== 'none');
        const start = (this.state.currentPage - 1) * this.state.rowsPerPage;
        const end = start + this.state.rowsPerPage;

        visibleRows.forEach((row, index) => {
            row.style.display = (index >= start && index < end) ? '' : 'none';
        });
    }

    // Utility function for debouncing
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize handler with improved error handling
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌟 DOM Content Loaded - Starting initialization');
    
    try {
        if (window.tableHandler) {
            console.warn('TableHandler already initialized, cleaning up...');
            // Cleanup existing instance if needed
            delete window.tableHandler;
        }
        window.tableHandler = new XMLTableHandler();
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger mt-3';
        errorDiv.innerHTML = `Failed to initialize table handler: ${error.message}`;
        document.body.insertBefore(errorDiv, document.body.firstChild);
    }
});

// Service worker registration with error recovery and update handling
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/accounts.office.cheque.inquiry/service-worker.js', {
            scope: '/accounts.office.cheque.inquiry/'
        })
        .then(registration => {
            console.log('✅ ServiceWorker registered:', registration.scope);
            // Check for updates
            registration.update();

            // Handle updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('🔄 ServiceWorker update found, installing...');

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('🔄 New ServiceWorker installed, ready for activation');
                    }
                });
            });
        })
        .catch(err => {
            console.error('❌ ServiceWorker registration failed:', err);
            // Attempt to unregister and re-register on failure
            navigator.serviceWorker.getRegistrations()
                .then(registrations => {
                    registrations.forEach(registration => registration.unregister());
                    console.log('🔄 Attempting to re-register ServiceWorker...');
                    // Re-registration will be handled by the next page load
                });
        });
    });
}
