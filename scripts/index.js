// THIS REPLIT CODE IS BEST WORKING FOR SERACHING FILTERING SORTING BUT NEED COLORING AND PAGINATION
// TRYING BY CLAUD FOR COLORING AND PAGINATION ON 2:38 16022025






/**
 * XMLTableHandler Class
 * A comprehensive solution for handling XML data in a table format with the following features:
 * - XML parsing and dynamic table generation
 * - Advanced search functionality with category filtering
 * - Column sorting (ascending/descending)
 * - Status color coding with visual indicators
 * - Pagination with configurable page sizes
 * - Responsive error handling and data caching
 * - Service worker integration for offline capabilities
 */





class XMLTableHandler {
    constructor() {
        // Initialize DOM elements
        this.tableBody = document.getElementById('checksTable');
        this.searchInput = document.getElementById('search');
        this.tableContainer = document.getElementById('tableContainer');
        this.emptyState = document.getElementById('emptyState');
        this.resultContainer = document.getElementById('result');
        this.narFilter = document.getElementById('narCategory');
        this.searchBtn = document.getElementById('searchBtn');

        // Pagination configuration
        this.currentPage = 1;
        this.rowsPerPage = 10;
        this.totalPages = 0;
        this.allRows = [];

        // Column definitions for sorting
        this.columns = {
            NARRATION: { index: 0, type: 'string' },
            AMOUNT: { index: 1, type: 'number' },
            CHEQ_NO: { index: 2, type: 'number' },
            NAR: { index: 3, type: 'string' },
            DD: { index: 4, type: 'string' }
        };

        // Sorting state
        this.sortState = {
            column: '',
            ascending: true
        };

        // Feature flags
        this.enableLiveUpdate = false;
        this.tableResetEnabled = true;
        this.BackspaceDefault = true;

        // Status color mapping
        this.statusColors = {
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

        this.initializeEventListeners();
        this.createPaginationControls();
    }

       /**
     * Initialize all event listeners for the table functionality
     */
    initializeEventListeners() {
        // Search and filter events
        this.searchInput.addEventListener('keydown', this.handleKeyDown.bind(this));
        this.searchBtn.addEventListener('click', () => this.search());
        this.narFilter.addEventListener('change', () => this.search());

        // Sorting events
        document.querySelectorAll('th[data-column]').forEach(header => {
            header.addEventListener('click', () => {
                const column = header.getAttribute('data-column');
                if (column) this.sortTable(column);
            });
        });

        // Pagination events
        document.getElementById('prevPage')?.addEventListener('click', () => this.changePage(-1));
        document.getElementById('nextPage')?.addEventListener('click', () => this.changePage(1));
    }

    /**
     * Handle keydown events for search input
     * @param {KeyboardEvent} e - The keydown event
     */
    handleKeyDown(e) {
        if (e.key === 'Enter') {
            this.search();
        }

        if (e.key === 'Backspace' && this.tableResetEnabled) {
            let inputBefore = this.searchInput.value.trim();
            setTimeout(() => {
                let inputAfter = this.searchInput.value.trim();
                if (this.BackspaceDefault && inputBefore.length > 1) {
                    let caretPosition = this.searchInput.selectionStart;
                    this.resetTable();
                    this.searchInput.value = inputAfter;
                    this.searchInput.setSelectionRange(caretPosition, caretPosition);
                    this.BackspaceDefault = false;
                }
                if (inputAfter.length > 0) {
                    this.BackspaceDefault = true;
                }
            }, 0);
        }
    }

    /**
     * Creates pagination controls and adds them to the DOM
     */
    createPaginationControls() {
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination-controls';
        paginationContainer.innerHTML = `
            <button id="prevPage">Previous</button>
            <span class="page-info">Page <span id="currentPage">1</span> of <span id="totalPages">1</span></span>
            <button id="nextPage">Next</button>
            <select id="pageSize">
                <option value="10">10 per page</option>
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
            </select>
        `;
        this.tableContainer.appendChild(paginationContainer);

        // Add page size change event
        document.getElementById('pageSize').addEventListener('change', (e) => {
            this.rowsPerPage = parseInt(e.target.value);
            this.currentPage = 1;
            this.updateTableDisplay();
        });
    }

    /**
     * Updates the table display based on current pagination settings
     */
    updateTableDisplay() {
        const startIndex = (this.currentPage - 1) * this.rowsPerPage;
        const endIndex = startIndex + this.rowsPerPage;
        const visibleRows = this.allRows.slice(startIndex, endIndex);

        // Clear and update table
        this.tableBody.innerHTML = '';
        visibleRows.forEach(row => this.tableBody.appendChild(row));

        // Update pagination info
        this.totalPages = Math.ceil(this.allRows.length / this.rowsPerPage);
        document.getElementById('currentPage').textContent = this.currentPage;
        document.getElementById('totalPages').textContent = this.totalPages;

        // Update button states
        document.getElementById('prevPage').disabled = this.currentPage === 1;
        document.getElementById('nextPage').disabled = this.currentPage === this.totalPages;
    }

    /**
     * Sort table by specified column
     * @param {string} column - The column to sort by
     */
    sortTable(column) {
        console.log(`Sorting by column: ${column}`);
        const rows = Array.from(this.tableBody.getElementsByTagName('tr'));
        const type = this.columns[column].type;
        const ascending = this.sortState.column === column ? !this.sortState.ascending : true;

        rows.sort((a, b) => {
            let aValue = a.querySelector(`td[data-field="${column}"]`).textContent.trim();
            let bValue = b.querySelector(`td[data-field="${column}"]`).textContent.trim();

            if (type === 'number') {
                aValue = parseFloat(aValue.replace(/,/g, '')) || 0;
                bValue = parseFloat(bValue.replace(/,/g, '')) || 0;
            }

            if (aValue < bValue) return ascending ? -1 : 1;
            if (aValue > bValue) return ascending ? 1 : -1;
            return 0;
        });

        // Update sort icons
        document.querySelectorAll('th[data-column] .sort-icon').forEach(icon => {
            icon.textContent = '';
        });

        const currentHeader = document.querySelector(`th[data-column="${column}"]`);
        const sortIcon = currentHeader.querySelector('.sort-icon');
        sortIcon.textContent = ascending ? ' ↑' : ' ↓';

        // Update sort state
        this.sortState = { column, ascending };

        // Update table with sorted rows
        this.allRows = rows;
        this.updateTableDisplay();
    }

    /**
     * Determines the status color class based on the status text
     * @param {string} status - The status text to analyze
     * @returns {string} The corresponding CSS class for the status color
     */
    getStatusColor(status) {
        const lowerStatus = status.toLowerCase().trim();
        
        // Check each status pattern and return corresponding color class
        for (const [pattern, colorClass] of Object.entries(this.statusColors)) {
            if (lowerStatus.includes(pattern)) {
                return colorClass;
            }
        }
        
        // Log unmatched status for debugging
        console.log(`Unmatched status: ${status}`);
        return 'status-gray';
    }

    /**
     * Creates a table row from an XML element
     * @param {Element} element - The XML element containing row data
     * @returns {HTMLTableRowElement} The created table row
     */
    createTableRow(element) {
        const row = document.createElement('tr');
        row.setAttribute('data-nar', element.getElementsByTagName('NAR')[0]?.textContent?.trim().toLowerCase() || '');

        Object.keys(this.columns).forEach(field => {
            const cell = document.createElement('td');
            let value = element.getElementsByTagName(field)[0]?.textContent?.trim() || '';

            // Format amount values
            if (field === 'AMOUNT') {
                try {
                    value = parseFloat(value).toLocaleString('en-US');
                } catch (error) {
                    console.warn(`Invalid amount value: ${value}`);
                    value = '0';
                }
            }

            cell.textContent = value;
            cell.setAttribute('data-field', field);

            // Apply status colors to the "DD" column
            if (field === 'DD') {
                const statusClass = this.getStatusColor(value);
                cell.className = statusClass;
            }

            row.appendChild(cell);
        });

        return row;
    }

     /**
     * Parse XML data and create table rows
     * @param {string} xmlString - The XML string to parse
     * @returns {boolean} Success status of the parsing operation
     */
    parseXMLToTable(xmlString = null) {
        try {
            console.log('Starting XML parsing...');
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString || this.xmlData, "text/xml");

            if (xmlDoc.querySelector('parsererror')) {
                console.error('XML parsing error:', xmlDoc.querySelector('parsererror').textContent);
                throw new Error('XML parsing error');
            }

            const entries = xmlDoc.getElementsByTagName('G_PVN');
            this.tableBody.innerHTML = '';
            this.allRows = [];

            Array.from(entries).forEach((element) => {
                const row = this.createTableRow(element);
                this.allRows.push(row);
            });

            console.log(`Successfully parsed ${this.allRows.length} entries`);
            this.updateTableDisplay();
            return true;
        } catch (error) {
            console.error('Error in parseXMLToTable:', error);
            this.showError('Failed to parse XML data');
            return false;
        }
    }

    /**
     * Fetch XML data from server or use cached data
     * @returns {Promise<boolean>} Success status of the fetch operation
     */
    async fetchXMLData() {
        try {
            console.log('Fetching XML data...');
            const filesResponse = await fetch('/accounts.office.cheque.inquiry/public/data/files.json');
            if (!filesResponse.ok) throw new Error(`HTTP error! Status: ${filesResponse.status}`);
            const xmlFiles = await filesResponse.json();

            let combinedXML = '<root>';
            console.log(`Found ${xmlFiles.length} XML files to process`);

            for (const file of xmlFiles) {
                console.log(`Fetching file: ${file}`);
                const fileResponse = await fetch(`/accounts.office.cheque.inquiry/public/data/${file}`);
                if (!fileResponse.ok) throw new Error(`HTTP error for file: ${file}`);
                let xmlContent = await fileResponse.text();
                // Remove XML declaration and root tags from individual files
                xmlContent = xmlContent.replace(/<\?xml[^>]+\?>/, '');
                xmlContent = xmlContent.replace(/<\/?root>/g, '');
                combinedXML += xmlContent;
            }
            combinedXML += '</root>';

            console.log('Successfully combined XML data');
            localStorage.setItem('xmlData', combinedXML);
            this.xmlData = combinedXML;
            return this.parseXMLToTable(combinedXML);
        } catch (error) {
            console.error('Error fetching XML:', error);
            const storedXML = localStorage.getItem('xmlData');
            if (storedXML) {
                console.log('Using cached XML data');
                return this.parseXMLToTable(storedXML);
            }
            this.showError('Failed to load XML data');
            return false;
        }
    }

    /**
     * Perform search and filtering on table data
     */
    search() {
        console.log('Performing search...');
        const searchTerm = this.searchInput.value.toLowerCase();
        const selectedCategory = this.narFilter.value.toLowerCase();

        if (!searchTerm && selectedCategory === 'all') {
            return this.resetTable();
        }

        this.tableContainer.style.display = 'block';
        this.emptyState.style.display = 'none';
        this.resultContainer.style.display = 'block';

        // Filter rows based on search criteria
        this.allRows = Array.from(this.tableBody.getElementsByTagName('tr'));
        const filteredRows = this.allRows.filter(row => {
            const narValue = row.getAttribute('data-nar');
            const cells = Array.from(row.getElementsByTagName('td'));

            const matchesCategory = selectedCategory === 'all' || narValue.includes(selectedCategory);
            const matchesSearch = !searchTerm || cells.some(cell =>
                cell.textContent.toLowerCase().includes(searchTerm)
            );

            return matchesCategory && matchesSearch;
        });

        this.allRows = filteredRows;
        this.currentPage = 1;
        this.updateTableDisplay();
        this.updateSearchResults(searchTerm, selectedCategory, filteredRows.length);
    }

    /**
     * Update search results message
     * @param {string} searchTerm - The current search term
     * @param {string} category - The selected category
     * @param {number} matchCount - Number of matching results
     */
    updateSearchResults(searchTerm, category, matchCount) {
        let message = '';
        if (searchTerm && category !== 'all') {
            message = `Found ${matchCount} results for "${searchTerm}" in category "${this.narFilter.options[this.narFilter.selectedIndex].text}"`;
        } else if (searchTerm) {
            message = `Found ${matchCount} results for "${searchTerm}" in all categories`;
        } else if (category !== 'all') {
            message = `Found ${matchCount} results in category "${this.narFilter.options[this.narFilter.selectedIndex].text}"`;
        }

        this.resultContainer.textContent = matchCount > 0 ? message : 'No results found.';
        console.log(`Search complete: ${message}`);
    }

    /**
     * Reset table to initial state
     */
    resetTable() {
        console.log('Resetting table...');
        this.searchInput.value = '';
        this.narFilter.value = 'all';
        this.tableContainer.style.display = 'none';
        this.emptyState.style.display = 'block';
        this.resultContainer.style.display = 'none';
        
        // Reset pagination
        this.currentPage = 1;
        this.parseXMLToTable(this.xmlData);
        this.updateTableDisplay();
    }

    /**
     * Show error message
     * @param {string} message - The error message to display
     */
    showError(message) {
        console.error(`Error: ${message}`);
        this.resultContainer.textContent = message;
        this.resultContainer.style.display = 'block';
        this.resultContainer.className = 'error-state';
    }

    /**
     * Change current page
     * @param {number} delta - The change in page number (+1 or -1)
     */
    changePage(delta) {
        const newPage = this.currentPage + delta;
        if (newPage >= 1 && newPage <= this.totalPages) {
            console.log(`Changing to page ${newPage}`);
            this.currentPage = newPage;
            this.updateTableDisplay();
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing XMLTableHandler...');
    const handler = new XMLTableHandler();
    handler.fetchXMLData().then(() => {
        console.log('XML data loaded successfully');
        handler.resetTable();
    }).catch(error => {
        console.error('Failed to initialize table:', error);
    });
});

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/accounts.office.cheque.inquiry/service-worker.js', {
            scope: '/accounts.office.cheque.inquiry/'
        })
            .then(registration => console.log('ServiceWorker registered:', registration.scope))
            .catch(err => console.error('ServiceWorker registration failed:', err));
    });
}












// CSS Styles
const styles = `
.table-container {
    margin: 20px;
    overflow-x: auto;
}

.search-container {
    margin: 20px;
    display: flex;
    gap: 10px;
    align-items: center;
}

.search-input {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    width: 300px;
}

.search-button {
    padding: 8px 16px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.search-button:hover {
    background-color: #0056b3;
}

.category-filter {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.data-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
}

.data-table th,
.data-table td {
    padding: 12px;
    border: 1px solid #ddd;
    text-align: left;
}

.data-table th {
    background-color: #f5f5f5;
    cursor: pointer;
}

.data-table th:hover {
    background-color: #e9e9e9;
}

.sort-icon {
    margin-left: 5px;
}

/* Status Colors */
.status-orange { background-color: #FFB74D; color: black; }
.status-green { background-color: #81C784; color: black; }
.status-red { background-color: #E57373; color: white; }
.status-blue { background-color: #64B5F6; color: black; }
.status-purple { background-color: #BA68C8; color: white; }
.status-dark-red { background-color: #D32F2F; color: white; }
.status-yellow { background-color: #FFF176; color: black; }
.status-cyan { background-color: #4DD0E1; color: black; }
.status-gray { background-color: #BDBDBD; color: black; }

/* Pagination Controls */
.pagination-controls {
    margin-top: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
}

.pagination-controls button {
    padding: 8px 16px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.pagination-controls button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
}

.pagination-controls select {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.page-info {
    margin: 0 10px;
}

/* Empty State */
.empty-state {
    text-align: center;
    padding: 40px;
    color: #666;
}

/* Result Container */
.result-container {
    margin: 20px;
    padding: 10px;
    background-color: #f8f9fa;
    border-radius: 4px;
}

/* Error State */
.error-state {
    color: #dc3545;
    padding: 10px;
    margin: 20px;
    border: 1px solid #dc3545;
    border-radius: 4px;
    background-color: #f8d7da;
}
`;

// // Add styles to document
// const styleSheet = document.createElement('style');
// styleSheet.textContent = styles;
// document.head.appendChild(styleSheet);

// HTML Template
// const template = `
// <div class="search-container">
//     <input type="text" id="search" class="search-input" placeholder="Search...">
//     <select id="narCategory" class="category-filter">
//         <option value="all">All Categories</option>
//         <option value="salary">Salary</option>
//         <option value="vendor">Vendor</option>
//         <option value="utility">Utility</option>
//         <option value="other">Other</option>
//     </select>
//     <button id="searchBtn" class="search-button">Search</button>
// </div>

// <div id="tableContainer" class="table-container">
//     <table class="data-table">
//         <thead>
//             <tr>
//                 <th data-column="NARRATION">Narration <span class="sort-icon"></span></th>
//                 <th data-column="AMOUNT">Amount <span class="sort-icon"></span></th>
//                 <th data-column="CHEQ_NO">Cheque No <span class="sort-icon"></span></th>
//                 <th data-column="NAR">NAR <span class="sort-icon"></span></th>
//                 <th data-column="DD">Status <span class="sort-icon"></span></th>
//             </tr>
//         </thead>
//         <tbody id="checksTable"></tbody>
//     </table>
// </div>

// <div id="emptyState" class="empty-state">
//     <h3>No results found</h3>
//     <p>Try adjusting your search or filter criteria</p>
// </div>

// <div id="result" class="result-container"></div>
// `;

// Add template to document
// const templateContainer = document.createElement('div');
// templateContainer.innerHTML = template;
// document.body.appendChild(templateContainer);

// class XMLTableHandler {
//     constructor() {
//         // Initialize DOM elements
//         this.tableBody = document.getElementById('checksTable');
//         this.searchInput = document.getElementById('search');
//         this.tableContainer = document.getElementById('tableContainer');
//         this.emptyState = document.getElementById('emptyState');
//         this.resultContainer = document.getElementById('result');
//         this.narFilter = document.getElementById('narCategory');
//         this.searchBtn = document.getElementById('searchBtn');

//         // Pagination configuration
//         this.currentPage = 1;
//         this.rowsPerPage = 10;
//         this.totalPages = 0;
//         this.allRows = [];

//         // Column definitions for sorting
//         this.columns = {
//             NARRATION: { index: 0, type: 'string' },
//             AMOUNT: { index: 1, type: 'number' },
//             CHEQ_NO: { index: 2, type: 'number' },
//             NAR: { index: 3, type: 'string' },
//             DD: { index: 4, type: 'string' }
//         };

//         // Sorting state
//         this.sortState = {
//             column: '',
//             ascending: true
//         };

//         // Feature flags
//         this.enableLiveUpdate = false;
//         this.tableResetEnabled = true;
//         this.BackspaceDefault = true;

//         // Status color mapping
//         this.statusColors = {
//             'despatched through gpo': 'status-orange',
//             'ready but not signed yet': 'status-green',
//             'cheque ready': 'status-green',
//             'despatched to lakki camp office': 'status-red',
//             'sent to chairman': 'status-blue',
//             'expired': 'status-purple',
//             'cancelled': 'status-dark-red',
//             'rejected': 'status-dark-red',
//             'on hold': 'status-yellow',
//             'processing': 'status-cyan'
//         };

//         this.initializeEventListeners();
//         this.createPaginationControls();
//     }












    

    /**
     * Determines the status color class based on the status text
     * @param {string} status - The status text to analyze
     * @returns {string} The corresponding CSS class for the status color
     */
    // getStatusColor(status) {
    //     const lowerStatus = status.toLowerCase();
        
    //     // Check each status pattern and return corresponding color class
    //     for (const [pattern, colorClass] of Object.entries(this.statusColors)) {
    //         if (lowerStatus.includes(pattern)) {
    //             return colorClass;
    //         }
    //     }
        
    //     // Log unmatched status for debugging
    //     console.log(`Unmatched status: ${status}`);
    //     return 'status-gray';
    // }

    // /**
    //  * Creates a table row from an XML element
    //  * @param {Element} element - The XML element containing row data
    //  * @returns {HTMLTableRowElement} The created table row
    //  */
    // createTableRow(element) {
    //     const row = document.createElement('tr');
    //     row.setAttribute('data-nar', element.getElementsByTagName('NAR')[0]?.textContent?.trim().toLowerCase() || '');

    //     Object.keys(this.columns).forEach(field => {
    //         const cell = document.createElement('td');
    //         let value = element.getElementsByTagName(field)[0]?.textContent?.trim() || '';

    //         // Format amount values
    //         if (field === 'AMOUNT') {
    //             try {
    //                 value = parseFloat(value).toLocaleString('en-US');
    //             } catch (error) {
    //                 console.warn(`Invalid amount value: ${value}`);
    //                 value = '0';
    //             }
    //         }

    //         cell.textContent = value;
    //         cell.setAttribute('data-field', field);

    //         // Apply status colors
    //         if (field === 'DD') {
    //             const statusClass = this.getStatusColor(value);
    //             cell.className = statusClass;
    //         }

    //         row.appendChild(cell);
    //     });

    //     return row;
    // }

  
