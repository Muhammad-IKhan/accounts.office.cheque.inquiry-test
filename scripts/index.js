class XMLTableHandler {
    constructor() {
        // Initialize DOM elements
        this.tableBody = document.getElementById('checksTable');
        this.searchInput = document.getElementById('search');
        this.tableContainer = document.getElementById('tableContainer');
        this.emptyState = document.getElementById('emptyState');
        this.resultContainer = document.getElementById('result');

        // Column configuration
        this.columns = {
            NARRATION: { index: 0, type: 'string' },
            AMOUNT: { index: 1, type: 'number' },
            CHEQ_NO: { index: 2, type: 'number' },
            NAR: { index: 3, type: 'string' },
            DD: { index: 4, type: 'string' },
        };

        // Initialize flags
        this.enableLiveUpdate = true; // Toggle live update ON/OFF
        this.tableResetEnabled = true; // Toggle table reset ON/OFF
        this.firstBackspace = true; // Track first Backspace press for reset behavior

        // Initialize event listeners
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Define event configurations for search input
        const searchEvents = {
            enter: 'keydown', // Handles enter key search trigger
            liveUpdate: 'input', // Handles live updates
            tableReset: 'keydown', // Handles table reset
        };

        // Handle Backspace (Table Reset Logic)
        this.searchInput.addEventListener(searchEvents.tableReset, (e) => {
            console.log(`Key pressed: ${e.key}`);

            if (e.key === 'Backspace' && this.tableResetEnabled) {
                console.log(`[BACKSPACE] Pressed, checking conditions...`);

                let inputBefore = this.searchInput.value.trim();
                console.log(`[BACKSPACE] Current input value: "${inputBefore}"`);

                setTimeout(() => {
                    let inputAfter = this.searchInput.value.trim();
                    console.log(`[BACKSPACE] After delay, new input value: "${inputAfter}"`);

                    if (this.firstBackspace && inputBefore.length > 1) {
                        console.log(`[BACKSPACE] Resetting table...`);

                        let caretPosition = this.searchInput.selectionStart; // Save cursor position
                        this.resetTable();
                        this.searchInput.value = inputAfter; // Restore input text after reset
                        this.searchInput.setSelectionRange(caretPosition, caretPosition); // Restore cursor position

                        this.firstBackspace = false; // Prevent multiple resets
                        console.log(`[BACKSPACE] Table reset triggered.`);
                    }

                    if (inputAfter.length > 0) {
                        this.firstBackspace = true; // Allow reset only after new input
                        console.log(`[BACKSPACE] Reset flag re-enabled.`);
                    } else {
                        console.log(`[BACKSPACE] Input is empty, keeping reset flag.`);
                    }
                }, 0);
            }
        });

        // Handle Enter key to trigger search
        this.searchInput.addEventListener(searchEvents.enter, (e) => {
            if (e.key === 'Enter') {
                console.log(`[ENTER] Key pressed. Triggering search...`);
                this.searchAndFilterXML();
            }
        });

        // Handle live updates (conditionally active based on the flag)
        this.searchInput.addEventListener(searchEvents.liveUpdate, (e) => {
            if (this.enableLiveUpdate) {
                console.log('[LIVE UPDATE] Input changed. Performing search...');
                this.searchAndFilterXML();
            } else {
                console.log('[LIVE UPDATE] Disabled. Ignoring input change.');
                e.preventDefault(); // Prevents the live update action from executing
            }
        });

        // Initialize sorting handlers for each column
        Object.keys(this.columns).forEach(columnName => {
            const header = document.querySelector(`th[data-column="${columnName}"]`);
            if (header) {
                header.addEventListener('click', () => {
                    console.log(`[SORT] Sorting by column: ${columnName}`);
                    this.sortTable(columnName);
                });
            } else {
                console.log(`[SORT] Warning: No header found for column "${columnName}".`);
            }
        });

        console.log('✅ Event listeners initialized successfully.');
    }
}




    parseXMLToTable(xmlString = null) {
        try {
            console.log('Starting XML parsing...');
            const parser = new DOMParser();
            
            // Use the provided xmlString or fallback to the stored xmlData
            const xmlDoc = parser.parseFromString(xmlString || this.xmlData, "text/xml");
            
            // Check for parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                throw new Error('XML parsing error: ' + parserError.textContent);
            }

            // Get all G_PVN elements from the XML document
            const gPvnElements = xmlDoc.getElementsByTagName('G_PVN');
            console.log(`Found ${gPvnElements.length} G_PVN elements`);

            // Ensure the table body element exists
            if (!this.tableBody) {
                throw new Error('Table body element not found');
            }

            // Clear existing table content
            this.tableBody.innerHTML = '';

            // Create and append table rows for each G_PVN element
            Array.from(gPvnElements).forEach((element, index) => {
                const row = this.createTableRow(element);
                this.tableBody.appendChild(row);
            });

            console.log('Table population complete');
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
            let value = element.getElementsByTagName(field)[0]?.textContent.trim() || '';
            
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
            row.appendChild(cell);
        });

        return row;
    }

    async fetchXMLData() {
        try {
            console.log('Fetching XML data...');

            // Fetch the list of XML files from files.json
            const filesResponse = await fetch('/accounts.office.cheque.inquiry/public/data/files.json');
            
            if (!filesResponse.ok) {
                throw new Error(`HTTP error! Status: ${filesResponse.status}`);
            }

            const xmlFiles = await filesResponse.json();
            console.log('Found XML files:', xmlFiles);

            let combinedXMLData = '<root>'; // Wrap combined XML data in a root element

            // Fetch and combine the content of all XML files
            for (const file of xmlFiles) {
                const fileUrl = `/accounts.office.cheque.inquiry/public/data/${file}`;
                console.log(`Fetching file: ${fileUrl}`);

                const fileResponse = await fetch(fileUrl);
                
                if (!fileResponse.ok) {
                    throw new Error(`HTTP error! Status: ${fileResponse.status} for file: ${fileUrl}`);
                }
                
                const data = await fileResponse.text();
                console.log(`Successfully fetched file: ${fileUrl}`);
                combinedXMLData += data;
            }

            combinedXMLData += '</root>'; // Close the root element
            console.log('XML data fetched successfully');
            
            // Store the combined XML data in localStorage and as a class property
            localStorage.setItem('xmlData', combinedXMLData);
            this.xmlData = combinedXMLData;
            
            return this.parseXMLToTable(combinedXMLData);
        } catch (error) {
            console.error('Error fetching XML:', error);
            
            // Fallback to stored XML data in localStorage if available
            const storedXML = localStorage.getItem('xmlData');
            if (storedXML) {
                console.log('Loading XML from localStorage');
                return this.parseXMLToTable(storedXML);
            }
            
            this.showError('Failed to load XML data');
            return false;
        }
    }

    searchAndFilterXML() {
        const searchTerm = this.searchInput.value.toLowerCase();
        
        if (!searchTerm) {
            this.resetTable();
            return;
        }

        this.tableContainer.style.display = 'block';
        this.emptyState.style.display = 'none';
        this.resultContainer.style.display = 'block';

        const rows = this.tableBody.querySelectorAll('tr');
        let matchCount = 0;

        rows.forEach(row => {
            const cells = row.getElementsByTagName('td');
            const matchesSearch = Array.from(cells).some(cell => 
                cell.textContent.toLowerCase().includes(searchTerm)
            );

            row.style.display = matchesSearch ? '' : 'none';
            if (matchesSearch) matchCount++;
        });

        this.updateSearchResults(searchTerm, matchCount);
    }

    updateSearchResults(searchTerm, matchCount) {
        this.resultContainer.innerHTML = matchCount > 0
            ? `<i class="fas fa-check-circle"></i> Found ${matchCount} results for "${searchTerm}"`
            : '<i class="fas fa-times-circle"></i> No results found.';
    }

    sortTable(columnName) {
        const column = this.columns[columnName];
        if (!column) return;

        const header = document.querySelector(`th[data-column="${columnName}"]`);
        const isAscending = !header.classList.contains('sort-asc');

        // Update sort indicators
        document.querySelectorAll('th').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });
        header.classList.add(isAscending ? 'sort-asc' : 'sort-desc');

        const rows = Array.from(this.tableBody.querySelectorAll('tr'));
        
        rows.sort((a, b) => {
            const aValue = a.cells[column.index].textContent.trim();
            const bValue = b.cells[column.index].textContent.trim();

            if (column.type === 'number') {
                const aNum = parseFloat(aValue.replace(/,/g, '')) || 0;
                const bNum = parseFloat(bValue.replace(/,/g, '')) || 0;
                return isAscending ? aNum - bNum : bNum - aNum;
            }

            return isAscending
                ? aValue.localeCompare(bValue, undefined, { numeric: true })
                : bValue.localeCompare(aValue, undefined, { numeric: true });
        });

        rows.forEach(row => this.tableBody.appendChild(row));
    }

    resetTable() {
        this.searchInput.value = '';
        this.tableContainer.style.display = 'none';
        this.emptyState.style.display = 'block';
        this.resultContainer.style.display = 'none';
    }

    showError(message) {
        this.resultContainer.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        this.resultContainer.style.display = 'block';
    }
}

// Initialize the handler when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const handler = new XMLTableHandler();
    handler.fetchXMLData().then(() => {
        handler.resetTable();
    });
});

// Service Worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        const swPath = '/accounts.office.cheque.inquiry/service-worker.js';
        
        navigator.serviceWorker.register(swPath, {
            scope: '/accounts.office.cheque.inquiry/'
        })
        .then(registration => {
            console.log('ServiceWorker registration successful with scope:', registration.scope);
        })
        .catch(err => {
            console.error('ServiceWorker registration failed:', err);
        });
    });
}

