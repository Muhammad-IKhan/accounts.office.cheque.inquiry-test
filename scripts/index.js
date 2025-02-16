class XMLTableHandler {
    constructor() {
        this.tableBody = document.getElementById('checksTable');
        this.searchInput = document.getElementById('search');
        this.tableContainer = document.getElementById('tableContainer');
        this.emptyState = document.getElementById('emptyState');
        this.resultContainer = document.getElementById('result');

        this.columns = {
            NARRATION: { index: 0, type: 'string' },
            AMOUNT: { index: 1, type: 'number' },
            CHEQ_NO: { index: 2, type: 'number' },
            NAR: { index: 3, type: 'string' },
            DD: { index: 4, type: 'string' },
        };

        this.enableLiveUpdate = false;
        this.tableResetEnabled = true;
        this.BackspaceDefault = true;

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.searchInput.addEventListener('keydown', (e) => {
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
        });

        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.searchAndFilterXML();
            }
        });

        this.searchInput.addEventListener('input', () => {
            if (this.enableLiveUpdate) {
                this.searchAndFilterXML();
            }
        });
    }

    parseXMLToTable(xmlString = null) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString || this.xmlData, "text/xml");
            
            if (xmlDoc.querySelector('parsererror')) {
                throw new Error('XML parsing error');
            }

            const gPvnElements = xmlDoc.getElementsByTagName('G_PVN');
            if (!this.tableBody) {
                throw new Error('Table body element not found');
            }

            this.tableBody.innerHTML = '';
            Array.from(gPvnElements).forEach((element) => {
                const row = this.createTableRow(element);
                this.tableBody.appendChild(row);
            });

            return true;
        } catch (error) {
            console.error('Error in parseXMLToTable:', error);
            this.showError('Failed to parse XML data');
            return false;
        }
    }

    createTableRow(element) {
    const row = document.createElement('tr');

    // Create and populate table cells for each column
    Object.keys(this.columns).forEach(field => {
        const cell = document.createElement('td');
        let value = element.getElementsByTagName(field)[0]?.textContent?.trim() || '';

        // Format the AMOUNT field as a number
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

        // **Apply Colors Based on Status (`DD` field)**
        if (field === 'DD') {
            let ddValue = value.toLowerCase(); // Normalize case

            if (ddValue.includes('despatched through gpo (manzoor sb #03349797611) on 31/01/25')) {
                cell.classList.add('status-orange');  // 🟠 Orange for "Despatched through GPO"
            } else if (ddValue.includes('cheque ready')) {
                cell.classList.add('status-green');   // ✅ Green for "Cheque Ready"
            } else if (ddValue.includes('despatched to lakki camp office ( aziz ullah api #03159853076 ) on 20/01/25')) {
                cell.classList.add('status-red');     // ❌ Red for "Despatched to Lakki Camp Office"
            } else if (ddValue.includes('sent to chairman sb. for sign')) {
                cell.classList.add('status-blue');    // 🔵 Blue for "Sent to Chairman for Sign"
            } else {
                cell.classList.add('status-gray');    // ⚪ Gray for unknown status
            }
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
            let combinedXMLData = '<root>';
            for (const file of xmlFiles) {
                const fileResponse = await fetch(`/accounts.office.cheque.inquiry/public/data/${file}`);
                if (!fileResponse.ok) throw new Error(`HTTP error for file: ${file}`);
                combinedXMLData += await fileResponse.text();
            }
            combinedXMLData += '</root>';
            localStorage.setItem('xmlData', combinedXMLData);
            this.xmlData = combinedXMLData;
            return this.parseXMLToTable(combinedXMLData);
        } catch (error) {
            console.error('Error fetching XML:', error);
            const storedXML = localStorage.getItem('xmlData');
            if (storedXML) return this.parseXMLToTable(storedXML);
            this.showError('Failed to load XML data');
            return false;
        }
    }

    searchAndFilterXML() {
        const searchTerm = this.searchInput.value.toLowerCase();
        if (!searchTerm) return this.resetTable();
        this.tableContainer.style.display = 'block';
        this.emptyState.style.display = 'none';
        this.resultContainer.style.display = 'block';
        let matchCount = 0;
        this.tableBody.querySelectorAll('tr').forEach(row => {
            const matchesSearch = Array.from(row.getElementsByTagName('td'))
                .some(cell => cell.textContent.toLowerCase().includes(searchTerm));
            row.style.display = matchesSearch ? '' : 'none';
            if (matchesSearch) matchCount++;
        });
        this.updateSearchResults(searchTerm, matchCount);
    }

    updateSearchResults(searchTerm, matchCount) {
        this.resultContainer.innerHTML = matchCount > 0
            ? `Found ${matchCount} results for "${searchTerm}"`
            : 'No results found.';
    }

    resetTable() {
        this.searchInput.value = '';
        this.tableContainer.style.display = 'none';
        this.emptyState.style.display = 'block';
        this.resultContainer.style.display = 'none';
    }

    showError(message) {
        this.resultContainer.innerHTML = message;
        this.resultContainer.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const handler = new XMLTableHandler();
    handler.fetchXMLData().then(() => handler.resetTable());
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/accounts.office.cheque.inquiry/service-worker.js', { scope: '/accounts.office.cheque.inquiry/' })
        .then(registration => console.log('ServiceWorker registered:', registration.scope))
        .catch(err => console.error('ServiceWorker registration failed:', err));
    });
}











// class XMLTableHandler {
//     constructor() {
//         console.log('Initializing XMLTableHandler...');
        
//         try {
//             this.initializeDOMElements();
//             this.defineColumns();
//             this.initializeState();
//             this.initializeEventListeners();
//             console.log('XMLTableHandler initialization successful');
//         } catch (error) {
//             console.error('Constructor Error:', error);
//             this.showError('Failed to initialize table handler');
//         }
//     }

//     initializeDOMElements() {
//         const required_elements = {
//             'checksTable': 'tableBody',
//             'search': 'searchInput',
//             'narCategory': 'narFilter',
//             'tableContainer': 'tableContainer',
//             'emptyState': 'emptyState',
//             'result': 'resultContainer'
//         };

//         for (const [id, prop] of Object.entries(required_elements)) {
//             const element = document.getElementById(id);
//             if (!element) {
//                 throw new Error(`Required element #${id} not found in DOM`);
//             }
//             this[prop] = element;
//             console.log(`✓ Found ${id} element`);
//         }
//     }

//     defineColumns() {
//         this.columns = {
//             NARRATION: { index: 0, type: 'string', required: true },
//             AMOUNT: { index: 1, type: 'number', required: true },
//             CHEQ_NO: { index: 2, type: 'number', required: true },
//             NAR: { index: 3, type: 'string', required: true },
//             DD: { index: 4, type: 'string', required: true }
//         };
//         console.log('Column structure defined:', Object.keys(this.columns));
//     }

//     initializeState() {
//         this.enableLiveUpdate = false;
//         this.tableResetEnabled = true;
//         this.BackspaceDefault = true;
//         this.xmlData = '';
//         this.lastSearchTerm = '';
//         this.lastFilterCategory = 'all';
//         console.log('State variables initialized');
//     }

//     initializeEventListeners() {
//         console.log('Setting up event listeners...');

//         try {
//             this.setupSearchListeners();
//             this.setupNarFilterListeners();
//             this.setupSorting();
//             console.log('Event listeners setup complete');
//         } catch (error) {
//             console.error('Error in event listener setup:', error);
//             this.showError('Failed to initialize event handlers');
//         }
//     }

//     setupSearchListeners() {
//         // Keydown event for search
//         this.searchInput.addEventListener('keydown', (e) => {
//             console.log('Search keydown event:', e.key);
            
//             if (e.key === 'Enter') {
//                 console.log('Enter key pressed - triggering search');
//                 this.search();
//             }

//             if (e.key === 'Backspace' && this.tableResetEnabled) {
//                 this.handleBackspace();
//             }
//         });

//         // Input event for live updates
//         this.searchInput.addEventListener('input', () => {
//             if (this.enableLiveUpdate) {
//                 console.log('Live update triggered');
//                 this.search();
//             }
//         });

//         // Search button click event
//         const searchBtn = document.getElementById('searchBtn');
//         if (searchBtn) {
//             searchBtn.addEventListener('click', () => {
//                 console.log('Search button clicked - triggering search');
//                 this.search();
//             });
//         } else {
//             console.warn('Search button not found');
//         }
//     }

//     setupSorting() {
//         const tableHeaders = document.querySelectorAll('#chequeTable th[data-column]');
//         tableHeaders.forEach(header => {
//             header.addEventListener('click', () => {
//                 const column = header.getAttribute('data-column');
//                 const isAscending = header.classList.toggle('asc');
//                 this.sortTable(column, isAscending);
//             });
//         });
//     }

//     sortTable(column, isAscending) {
//         const rows = Array.from(this.tableBody.querySelectorAll('tr'));
//         const columnIndex = this.columns[column].index;

//         rows.sort((rowA, rowB) => {
//             const cellA = rowA.querySelectorAll('td')[columnIndex].textContent.trim();
//             const cellB = rowB.querySelectorAll('td')[columnIndex].textContent.trim();

//             if (this.columns[column].type === 'number') {
//                 return isAscending ? parseFloat(cellA) - parseFloat(cellB) : parseFloat(cellB) - parseFloat(cellA);
//             } else {
//                 return isAscending ? cellA.localeCompare(cellB) : cellB.localeCompare(cellA);
//             }
//         });

//         this.tableBody.innerHTML = '';
//         rows.forEach(row => this.tableBody.appendChild(row));

//         console.log(`Table sorted by ${column} in ${isAscending ? 'ascending' : 'descending'} order`);
//     }

//     async fetchXMLData() {
//         console.log('Starting XML data fetch...');
        
//         try {
//             const filesResponse = await this.fetchWithTimeout('/accounts.office.cheque.inquiry/public/data/files.json');
//             const xmlFiles = await filesResponse.json();
//             console.log(`Found ${xmlFiles.length} XML files to process`);

//             let combinedXMLData = '<root>';
//             for (const file of xmlFiles) {
//                 console.log(`Fetching file: ${file}`);
//                 const fileResponse = await this.fetchWithTimeout(`/accounts.office.cheque.inquiry/public/data/${file}`);
//                 combinedXMLData += await fileResponse.text();
//             }
//             combinedXMLData += '</root>';

//             // Validate XML structure
//             if (!this.validateXMLStructure(combinedXMLData)) {
//                 throw new Error('Invalid XML structure detected');
//             }

//             localStorage.setItem('xmlData', combinedXMLData);
//             this.xmlData = combinedXMLData;
//             console.log('XML data successfully fetched and stored');

//             return this.parseXMLToTable(combinedXMLData);
//         } catch (error) {
//             console.error('XML fetch error:', error);
//             return this.handleXMLFetchError(error);
//         }
//     }

//     // ... (rest of the methods remain unchanged)
// }

// // Initialize handler with error catching
// document.addEventListener('DOMContentLoaded', () => {
//     console.log('DOM Content Loaded - Initializing XMLTableHandler');
    
//     try {
//         const handler = new XMLTableHandler();
//         handler.fetchXMLData().then(() => {
//             console.log('Initial data fetch complete');
//             handler.resetTable();
//         }).catch(error => {
//             console.error('Initialization error:', error);
//         });
//     } catch (error) {
//         console.error('Fatal initialization error:', error);
//     }
// });

// // Register service worker
// if ('serviceWorker' in navigator) {
//     window.addEventListener('load', () => {
//         navigator.serviceWorker.register('/accounts.office.cheque.inquiry/service-worker.js', { scope: '/accounts.office.cheque.inquiry/' })
//             .then(registration => console.log('ServiceWorker registered:', registration.scope))
//             .catch(err => console.error('ServiceWorker registration failed:', err));
//     });
// }
