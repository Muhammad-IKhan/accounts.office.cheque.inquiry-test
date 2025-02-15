class XMLTableHandler {
    constructor() {
        console.log('Initializing XMLTableHandler...');

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

        // Flag to track table reset state
        this.tableResetDone = false;

        // Flag for enabling/disabling live updates
        this.enableLiveUpdate = false; // Set to true if you want live updates

        // Initialize event listeners
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        console.log('Setting up event listeners...');

        // Handle Backspace for resetting table on first press
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                console.log('Backspace pressed.');
                if (!this.tableResetDone) {
                    this.resetTable();
                    this.tableResetDone = true;
                    console.log('Table reset triggered.');
                }

                setTimeout(() => {
                    if (this.searchInput.value.trim().length > 0) {
                        this.tableResetDone = false; // Allow reset again if input is re-typed
                        console.log('Reset flag re-enabled.');
                    }
                }, 10);
            }
        });

        // Handle Enter key for searching
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                console.log('Enter key pressed. Triggering search...');
                this.searchAndFilterXML();
            }
        });

        // Optional: Enable live updates if the flag is true
        if (this.enableLiveUpdate) {
            this.searchInput.addEventListener('input', () => {
                console.log('Live search triggered.');
                this.searchAndFilterXML();
            });
        }

        // Handle column sorting
        Object.keys(this.columns).forEach(columnName => {
            const header = document.querySelector(`th[data-column="${columnName}"]`);
            if (header) {
                header.addEventListener('click', () => {
                    console.log(`Sorting column: ${columnName}`);
                    this.sortTable(columnName);
                });
            }
        });
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
            console.log('XML files retrieved:', xmlFiles);

            let combinedXMLData = '<root>'; // Wrap combined XML data in a root element

            // Fetch and combine the content of all XML files
            for (const file of xmlFiles) {
                const fileUrl = `/accounts.office.cheque.inquiry/public/data/${file}`;
                console.log(`Fetching XML file: ${fileUrl}`);

                const fileResponse = await fetch(fileUrl);

                if (!fileResponse.ok) {
                    console.warn(`Skipping file due to error: ${fileUrl}`);
                    continue; // Skip problematic files
                }

                const data = await fileResponse.text();
                combinedXMLData += data;
            }

            combinedXMLData += '</root>'; // Close root element

            console.log('XML data successfully fetched and combined.');

            // Store XML data for future use
            localStorage.setItem('xmlData', combinedXMLData);
            this.xmlData = combinedXMLData;

            return this.parseXMLToTable(combinedXMLData);
        } catch (error) {
            console.error('Error fetching XML:', error);

            // Fallback to stored XML data in localStorage if available
            const storedXML = localStorage.getItem('xmlData');
            if (storedXML) {
                console.warn('Loading XML from localStorage as fallback.');
                return this.parseXMLToTable(storedXML);
            }

            this.showError('Failed to load XML data');
            return false;
        }
    }

    parseXMLToTable(xmlString) {
        try {
            console.log('Parsing XML data...');

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "text/xml");

            // Check for XML parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                throw new Error('XML parsing error: ' + parserError.textContent);
            }

            // Get all G_PVN elements
            const gPvnElements = xmlDoc.getElementsByTagName('G_PVN');
            console.log(`Found ${gPvnElements.length} G_PVN elements.`);

            // Clear existing table content
            this.tableBody.innerHTML = '';

            // Populate table rows
            Array.from(gPvnElements).forEach(element => {
                this.tableBody.appendChild(this.createTableRow(element));
            });

            console.log('Table populated successfully.');
            return true;
        } catch (error) {
            console.error('Error parsing XML:', error);
            this.showError('Failed to parse XML data');
            return false;
        }
    }

    createTableRow(element) {
        const row = document.createElement('tr');

        Object.keys(this.columns).forEach(field => {
            const cell = document.createElement('td');
            let value = element.getElementsByTagName(field)[0]?.textContent.trim() || '';

            if (field === 'AMOUNT') {
                try {
                    value = parseFloat(value).toLocaleString('en-US');
                } catch (error) {
                    console.warn(`Invalid amount value: ${value}`);
                    value = '0';
                }
            }

            cell.textContent = value;
            row.appendChild(cell);
        });

        return row;
    }

    searchAndFilterXML() {
        const searchTerm = this.searchInput.value.toLowerCase();
        console.log(`Searching for: "${searchTerm}"`);

        if (!searchTerm) {
            this.resetTable();
            return;
        }

        let matchCount = 0;
        const rows = this.tableBody.querySelectorAll('tr');

        rows.forEach(row => {
            const matchesSearch = Array.from(row.cells).some(cell =>
                cell.textContent.toLowerCase().includes(searchTerm)
            );

            row.style.display = matchesSearch ? '' : 'none';
            if (matchesSearch) matchCount++;
        });

        console.log(`Search results: ${matchCount} matches found.`);
        this.updateSearchResults(searchTerm, matchCount);
    }

    updateSearchResults(searchTerm, matchCount) {
        this.resultContainer.innerHTML = matchCount > 0
            ? `<i class="fas fa-check-circle"></i> Found ${matchCount} results for "${searchTerm}"`
            : '<i class="fas fa-times-circle"></i> No results found.';
    }

    resetTable() {
        console.log('Resetting table...');
        this.searchInput.value = '';
        this.tableBody.querySelectorAll('tr').forEach(row => row.style.display = '');
        this.resultContainer.style.display = 'none';
    }

    showError(message) {
        console.error(message);
        this.resultContainer.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        this.resultContainer.style.display = 'block';
    }
}

// Initialize class on DOM load
document.addEventListener('DOMContentLoaded', () => {
    const handler = new XMLTableHandler();
    handler.fetchXMLData().then(() => handler.resetTable());
});

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/accounts.office.cheque.inquiry/service-worker.js', { scope: '/accounts.office.cheque.inquiry/' })
            .then(reg => console.log('Service Worker registered:', reg.scope))
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}
