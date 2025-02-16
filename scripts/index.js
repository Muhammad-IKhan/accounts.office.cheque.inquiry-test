// THIS REPLIT CODE IS BEST WORKING FOR SERACHING FILTERING SORTING BUT NEED COLORING AND PAGINATION
// TRYING BY CLAUD FOR COLORING AND PAGINATION ON 2:38 16022025




/**
 * XMLTableHandler Class
 * Handles XML data parsing, table creation, searching, filtering, sorting, and pagination
 * Features:
 * - XML parsing and table generation
 * - Search functionality with category filtering
 * - Column sorting (ascending/descending)
 * - Status coloring based on predefined rules
 * - Pagination with configurable page size
 * - Responsive error handling and data caching
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
     * Creates pagination controls and adds them to the DOM
     */
    createPaginationControls() {
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination-controls';
        paginationContainer.innerHTML = `
            <button id="prevPage">Previous</button>
            <span id="pageInfo">Page <span id="currentPage">1</span> of <span id="totalPages">1</span></span>
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
     * Changes the current page by the specified delta
     * @param {number} delta - The change in page number (+1 or -1)
     */
    changePage(delta) {
        const newPage = this.currentPage + delta;
        if (newPage >= 1 && newPage <= this.totalPages) {
            this.currentPage = newPage;
            this.updateTableDisplay();
        }
    }

    /**
     * Determines the status color class based on the status text
     * @param {string} status - The status text to analyze
     * @returns {string} The corresponding CSS class for the status color
     */
    getStatusColor(status) {
        const lowerStatus = status.toLowerCase();
        
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

            // Apply status colors
            if (field === 'DD') {
                const statusClass = this.getStatusColor(value);
                cell.className = statusClass;
            }

            row.appendChild(cell);
        });

        return row;
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
                // Remove XML declaration and root tags from individual files
                xmlContent = xmlContent.replace(/<\?xml[^>]+\?>/, '');
                xmlContent = xmlContent.replace(/<\/?root>/g, '');
                combinedXML += xmlContent;
            }
            combinedXML += '</root>';

            console.log('Combined XML:', combinedXML); // Debug log
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

    search() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const selectedCategory = this.narFilter.value.toLowerCase();

        if (!searchTerm && selectedCategory === 'all') {
            return this.resetTable();
        }

        this.tableContainer.style.display = 'block';
        this.emptyState.style.display = 'none';
        this.resultContainer.style.display = 'block';

        let matchCount = 0;
        this.tableBody.querySelectorAll('tr').forEach(row => {
            const narValue = row.getAttribute('data-nar');
            const cells = Array.from(row.getElementsByTagName('td'));

            const matchesCategory = selectedCategory === 'all' || narValue.includes(selectedCategory);
            const matchesSearch = !searchTerm || cells.some(cell =>
                cell.textContent.toLowerCase().includes(searchTerm)
            );

            const visible = matchesCategory && matchesSearch;
            row.style.display = visible ? '' : 'none';
            if (visible) matchCount++;
        });

        this.updateSearchResults(searchTerm, selectedCategory, matchCount);
    }

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
    }

    resetTable() {
        this.searchInput.value = '';
        this.narFilter.value = 'all';
        this.tableContainer.style.display = 'none';
        this.emptyState.style.display = 'block';
        this.resultContainer.style.display = 'none';
        this.tableBody.querySelectorAll('tr').forEach(row => row.style.display = '');
    }

    showError(message) {
        this.resultContainer.textContent = message;
        this.resultContainer.style.display = 'block';
    }
// }
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












// class XMLTableHandler {
//     constructor() {
//         this.tableBody = document.getElementById('checksTable');
//         this.searchInput = document.getElementById('search');
//         this.tableContainer = document.getElementById('tableContainer');
//         this.emptyState = document.getElementById('emptyState');
//         this.resultContainer = document.getElementById('result');
//         this.narFilter = document.getElementById('narCategory');
//         this.searchBtn = document.getElementById('searchBtn');

//         // Define columns for sorting
//         this.columns = {
//             NARRATION: { index: 0, type: 'string' },
//             AMOUNT: { index: 1, type: 'number' },
//             CHEQ_NO: { index: 2, type: 'number' },
//             NAR: { index: 3, type: 'string' },
//             DD: { index: 4, type: 'string' }
//         };

//         this.sortState = {
//             column: '',
//             ascending: true
//         };

//         this.enableLiveUpdate = false;
//         this.tableResetEnabled = true;
//         this.BackspaceDefault = true;

//         this.initializeEventListeners();
//     }

//     initializeEventListeners() {
//         // Search and filter events
//         this.searchInput.addEventListener('keydown', this.handleKeyDown.bind(this));
//         this.searchBtn.addEventListener('click', () => this.search());
//         this.narFilter.addEventListener('change', () => this.search());

//         // Add sorting event listeners to table headers
//         document.querySelectorAll('th[data-column]').forEach(header => {
//             header.addEventListener('click', () => {
//                 const column = header.getAttribute('data-column');
//                 if (column) this.sortTable(column);
//             });
//         });
//     }

//     handleKeyDown(e) {
//         if (e.key === 'Enter') {
//             this.search();
//         }

//         if (e.key === 'Backspace' && this.tableResetEnabled) {
//             let inputBefore = this.searchInput.value.trim();
//             setTimeout(() => {
//                 let inputAfter = this.searchInput.value.trim();
//                 if (this.BackspaceDefault && inputBefore.length > 1) {
//                     let caretPosition = this.searchInput.selectionStart;
//                     this.resetTable();
//                     this.searchInput.value = inputAfter;
//                     this.searchInput.setSelectionRange(caretPosition, caretPosition);
//                     this.BackspaceDefault = false;
//                 }
//                 if (inputAfter.length > 0) {
//                     this.BackspaceDefault = true;
//                 }
//             }, 0);
//         }
//     }

//     sortTable(column) {
//         const rows = Array.from(this.tableBody.getElementsByTagName('tr'));
//         const type = this.columns[column].type;
//         const ascending = this.sortState.column === column ? !this.sortState.ascending : true;

//         rows.sort((a, b) => {
//             let aValue = a.querySelector(`td[data-field="${column}"]`).textContent.trim();
//             let bValue = b.querySelector(`td[data-field="${column}"]`).textContent.trim();

//             if (type === 'number') {
//                 aValue = parseFloat(aValue.replace(/,/g, '')) || 0;
//                 bValue = parseFloat(bValue.replace(/,/g, '')) || 0;
//             }

//             if (aValue < bValue) return ascending ? -1 : 1;
//             if (aValue > bValue) return ascending ? 1 : -1;
//             return 0;
//         });

//         // Update sort icons
//         document.querySelectorAll('th[data-column] .sort-icon').forEach(icon => {
//             icon.textContent = '';
//         });

//         const currentHeader = document.querySelector(`th[data-column="${column}"]`);
//         const sortIcon = currentHeader.querySelector('.sort-icon');
//         sortIcon.textContent = ascending ? ' ↑' : ' ↓';

//         // Update sort state
//         this.sortState = { column, ascending };

//         // Clear and re-append rows
//         while (this.tableBody.firstChild) {
//             this.tableBody.removeChild(this.tableBody.firstChild);
//         }
//         rows.forEach(row => this.tableBody.appendChild(row));
//     }

//     // getStatusColor(status) {
//     //     const lowerStatus = status.toLowerCase();
//     //     if (lowerStatus.includes('despatched through gpo')) {
//     //         return 'status-orange';
//     //     }
//     //     if (lowerStatus.includes('ready but not signed yet') || 
//     //         lowerStatus.includes('cheque ready')) {
//     //         return 'status-green';
//     //     }
//     //     if (lowerStatus.includes('despatched to lakki camp office')) {
//     //         return 'status-red';
//     //     }
//     //     if (lowerStatus.includes('sent to chairman')) {
//     //         return 'status-blue';
//     //     }
//     //     if (lowerStatus.includes('expired')) {
//     //         return 'status-purple';
//     //     }
//     //     if (lowerStatus.includes('cancelled') || 
//     //         lowerStatus.includes('rejected')) {
//     //         return 'status-dark-red';
//     //     }
//     //     if (lowerStatus.includes('on hold')) {
//     //         return 'status-yellow';
//     //     }
//     //     if (lowerStatus.includes('processing')) {
//     //         return 'status-cyan';
//     //     }
//     //     return 'status-gray';
//     // }

//     parseXMLToTable(xmlString = null) {
//         try {
//             const parser = new DOMParser();
//             const xmlDoc = parser.parseFromString(xmlString || this.xmlData, "text/xml");

//             if (xmlDoc.querySelector('parsererror')) {
//                 console.error('XML parsing error:', xmlDoc.querySelector('parsererror').textContent);
//                 throw new Error('XML parsing error');
//             }

//             const entries = xmlDoc.getElementsByTagName('G_PVN');
//             this.tableBody.innerHTML = '';

//             Array.from(entries).forEach((element) => {
//                 const row = this.createTableRow(element);
//                 this.tableBody.appendChild(row);
//             });

//             return true;
//         } catch (error) {
//             console.error('Error in parseXMLToTable:', error);
//             this.showError('Failed to parse XML data');
//             return false;
//         }
//     }

//     // createTableRow(element) {
//     //     const row = document.createElement('tr');
//     //     row.setAttribute('data-nar', element.getElementsByTagName('NAR')[0]?.textContent?.trim().toLowerCase() || '');

//     //     Object.keys(this.columns).forEach(field => {
//     //         const cell = document.createElement('td');
//     //         let value = element.getElementsByTagName(field)[0]?.textContent?.trim() || '';

//     //         if (field === 'AMOUNT') {
//     //             try {
//     //                 value = parseFloat(value).toLocaleString('en-US');
//     //             } catch (error) {
//     //                 console.warn(`Invalid amount value: ${value}`);
//     //                 value = '0';
//     //             }
//     //         }

//     //         cell.textContent = value;
//     //         cell.setAttribute('data-field', field);

//     //         if (field === 'DD') {
//     //             const statusClass = this.getStatusColor(value);
//     //             cell.className = statusClass;
//     //         }

//     //         row.appendChild(cell);
//     //     });

//     //     return row;
//     // }




//     createTableRow(element) {
//     const row = document.createElement('tr');

//     // Create and populate table cells for each column
//     Object.keys(this.columns).forEach(field => {
//         const cell = document.createElement('td');
//         let value = element.getElementsByTagName(field)[0]?.textContent?.trim() || '';

//         // Format the AMOUNT field as a number
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

//         // **Apply Colors Based on Status (`DD` field)**
//         if (field === 'DD') {
//             let ddValue = value.toLowerCase(); // Normalize case

//             if (ddValue.includes('despatched through gpo (manzoor sb #03349797611) on 31/01/25')) {
//                 cell.classList.add('status-orange');  // 🟠 Orange for "Despatched through GPO"
//             } else if (ddValue.includes('cheque ready')) {
//                 cell.classList.add('status-green');   // ✅ Green for "Cheque Ready"
//             } else if (ddValue.includes('despatched to lakki camp office ( aziz ullah api #03159853076 ) on 20/01/25')) {
//                 cell.classList.add('status-red');     // ❌ Red for "Despatched to Lakki Camp Office"
//             } else if (ddValue.includes('sent to chairman sb. for sign')) {
//                 cell.classList.add('status-blue');    // 🔵 Blue for "Sent to Chairman for Sign"
//             } else {
//                 cell.classList.add('status-gray');    // ⚪ Gray for unknown status
//             }
//         }

//         row.appendChild(cell);
//     });

//     return row;
// }
//     async fetchXMLData() {
//         try {
//             const filesResponse = await fetch('/accounts.office.cheque.inquiry/public/data/files.json');
//             if (!filesResponse.ok) throw new Error(`HTTP error! Status: ${filesResponse.status}`);
//             const xmlFiles = await filesResponse.json();

//             let combinedXML = '<root>';

//             for (const file of xmlFiles) {
//                 const fileResponse = await fetch(`/accounts.office.cheque.inquiry/public/data/${file}`);
//                 if (!fileResponse.ok) throw new Error(`HTTP error for file: ${file}`);
//                 let xmlContent = await fileResponse.text();
//                 // Remove XML declaration and root tags from individual files
//                 xmlContent = xmlContent.replace(/<\?xml[^>]+\?>/, '');
//                 xmlContent = xmlContent.replace(/<\/?root>/g, '');
//                 combinedXML += xmlContent;
//             }
//             combinedXML += '</root>';

//             console.log('Combined XML:', combinedXML); // Debug log
//             localStorage.setItem('xmlData', combinedXML);
//             this.xmlData = combinedXML;
//             return this.parseXMLToTable(combinedXML);
//         } catch (error) {
//             console.error('Error fetching XML:', error);
//             const storedXML = localStorage.getItem('xmlData');
//             if (storedXML) {
//                 console.log('Using cached XML data');
//                 return this.parseXMLToTable(storedXML);
//             }
//             this.showError('Failed to load XML data');
//             return false;
//         }
//     }

//     search() {
//         const searchTerm = this.searchInput.value.toLowerCase();
//         const selectedCategory = this.narFilter.value.toLowerCase();

//         if (!searchTerm && selectedCategory === 'all') {
//             return this.resetTable();
//         }

//         this.tableContainer.style.display = 'block';
//         this.emptyState.style.display = 'none';
//         this.resultContainer.style.display = 'block';

//         let matchCount = 0;
//         this.tableBody.querySelectorAll('tr').forEach(row => {
//             const narValue = row.getAttribute('data-nar');
//             const cells = Array.from(row.getElementsByTagName('td'));

//             const matchesCategory = selectedCategory === 'all' || narValue.includes(selectedCategory);
//             const matchesSearch = !searchTerm || cells.some(cell =>
//                 cell.textContent.toLowerCase().includes(searchTerm)
//             );

//             const visible = matchesCategory && matchesSearch;
//             row.style.display = visible ? '' : 'none';
//             if (visible) matchCount++;
//         });

//         this.updateSearchResults(searchTerm, selectedCategory, matchCount);
//     }

//     updateSearchResults(searchTerm, category, matchCount) {
//         let message = '';
//         if (searchTerm && category !== 'all') {
//             message = `Found ${matchCount} results for "${searchTerm}" in category "${this.narFilter.options[this.narFilter.selectedIndex].text}"`;
//         } else if (searchTerm) {
//             message = `Found ${matchCount} results for "${searchTerm}" in all categories`;
//         } else if (category !== 'all') {
//             message = `Found ${matchCount} results in category "${this.narFilter.options[this.narFilter.selectedIndex].text}"`;
//         }

//         this.resultContainer.textContent = matchCount > 0 ? message : 'No results found.';
//     }

//     resetTable() {
//         this.searchInput.value = '';
//         this.narFilter.value = 'all';
//         this.tableContainer.style.display = 'none';
//         this.emptyState.style.display = 'block';
//         this.resultContainer.style.display = 'none';
//         this.tableBody.querySelectorAll('tr').forEach(row => row.style.display = '');
//     }

//     showError(message) {
//         this.resultContainer.textContent = message;
//         this.resultContainer.style.display = 'block';
//     }
// }

// // Initialize the application
// document.addEventListener('DOMContentLoaded', () => {
//     const handler = new XMLTableHandler();
//     handler.fetchXMLData().then(() => handler.resetTable());
// });

// // Register Service Worker
// if ('serviceWorker' in navigator) {
//     window.addEventListener('load', () => {
//         navigator.serviceWorker.register('/accounts.office.cheque.inquiry/service-worker.js', {
//             scope: '/accounts.office.cheque.inquiry/'
//         })
//             .then(registration => console.log('ServiceWorker registered:', registration.scope))
//             .catch(err => console.error('ServiceWorker registration failed:', err));
//     });
// }
