class XMLTableHandler {
    constructor() {
        // Initialize DOM elements
        this.tableBody = document.getElementById('checksTable');
        this.searchInput = document.getElementById('search');
        this.narFilter = document.getElementById('narCategory');
        this.tableContainer = document.getElementById('tableContainer');
        this.emptyState = document.getElementById('emptyState');
        this.resultContainer = document.getElementById('result');

        // Check if DOM elements are found
        if (!this.tableBody || !this.searchInput || !this.narFilter || !this.tableContainer || !this.emptyState || !this.resultContainer) {
            console.error("One or more DOM elements are missing. Check your HTML structure.");
            return;
        }

        // Define table columns and their types
        this.columns = {
            NARRATION: { index: 0, type: 'string' },
            AMOUNT: { index: 1, type: 'number' },
            CHEQ_NO: { index: 2, type: 'number' },
            NAR: { index: 3, type: 'string' },
            DD: { index: 4, type: 'string' },
        };

        // Flags for live updates and table reset behavior
        this.enableLiveUpdate = false;
        this.tableResetEnabled = true;
        this.BackspaceDefault = true;

        // Initialize event listeners
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        console.log("Initializing event listeners...");

        // Backspace handling for search input
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
            if (e.key === 'Enter') {
                console.log("Enter key pressed. Performing search...");
                this.search();
            }
        });

        // Live search on input
        this.searchInput.addEventListener('input', () => {
            if (this.enableLiveUpdate) {
                console.log("Input detected. Performing live search...");
                this.search();
            }
        });

        // Filter by NAR category
        this.narFilter.addEventListener('change', () => {
            console.log("NAR category changed. Applying filter...");
            this.filterByNar();
            this.search(); // Reapply search after filtering
        });

        // Add sorting event listeners to table headers
        const headers = this.tableBody.querySelectorAll('th');
        if (headers.length > 0) {
            headers.forEach((header, index) => {
                header.style.cursor = 'pointer'; // Indicate clickable headers
                header.addEventListener('click', () => {
                    console.log(`Sorting by column index: ${index}`);
                    this.sortTable(index);
                });
            });
        } else {
            console.error("No table headers found. Check your HTML structure.");
        }
    }

    async fetchXMLData() {
        console.log("Fetching XML data...");
        try {
            // Fetch list of XML files
            const filesResponse = await fetch('/accounts.office.cheque.inquiry/public/data/files.json');
            if (!filesResponse.ok) throw new Error(`HTTP error! Status: ${filesResponse.status}`);
            const xmlFiles = await filesResponse.json();
            console.log("Fetched XML file list:", xmlFiles);

            // Combine XML data from all files
            let combinedXMLData = '<root>';
            for (const file of xmlFiles) {
                const fileResponse = await fetch(`/accounts.office.cheque.inquiry/public/data/${file}`);
                if (!fileResponse.ok) throw new Error(`Error fetching ${file}`);
                combinedXMLData += await fileResponse.text();
            }
            combinedXMLData += '</root>';

            // Store combined XML data in localStorage
            localStorage.setItem('xmlData', combinedXMLData);
            this.xmlData = combinedXMLData;
            console.log("XML data fetched and stored successfully.");

            // Parse and display the table
            return this.parseXMLToTable(combinedXMLData);
        } catch (error) {
            console.error('Error fetching XML:', error);
            const storedXML = localStorage.getItem('xmlData');
            if (storedXML) {
                console.log("Using cached XML data from localStorage.");
                return this.parseXMLToTable(storedXML);
            }
            this.showError('Failed to load XML data');
            return false;
        }
    }

    parseXMLToTable(xmlString = null) {
        console.log("Parsing XML data...");
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString || this.xmlData, "text/xml");

            // Check for XML parsing errors
            if (xmlDoc.querySelector('parsererror')) {
                throw new Error('XML parsing error');
            }

            // Get all <G_PVN> elements
            const gPvnElements = xmlDoc.getElementsByTagName('G_PVN');
            if (!gPvnElements || gPvnElements.length === 0) {
                throw new Error('No <G_PVN> elements found in XML data.');
            }

            // Clear existing table rows
            this.tableBody.innerHTML = '';

            // Create and append rows for each <G_PVN> element
            Array.from(gPvnElements).forEach((element) => {
                const row = this.createTableRow(element);
                this.tableBody.appendChild(row);
            });

            console.log("XML data successfully parsed and displayed.");
            this.tableContainer.style.display = 'block';
            this.emptyState.style.display = 'none';
            return true;
        } catch (error) {
            console.error('Error in parseXMLToTable:', error);
            this.showError('Failed to parse XML data');
            return false;
        }
    }

    createTableRow(element) {
        console.log("Creating table row...");
        const row = document.createElement('tr');
        let narValue = element.getElementsByTagName('NAR')[0]?.textContent?.trim() || '';
        row.setAttribute('data-nar', narValue.toLowerCase());

        // Create cells for each column
        Object.keys(this.columns).forEach(field => {
            const cell = document.createElement('td');
            let value = element.getElementsByTagName(field)[0]?.textContent?.trim() || '';

            // Format AMOUNT as a number
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

            // Apply status colors based on DD field
            if (field === 'DD') {
                let ddValue = value.toLowerCase();
                if (ddValue.includes('despatched through gpo (manzoor sb #03349797611) on 31/01/25')) {
                    cell.classList.add('status-orange');
                } else if (ddValue.includes('ready but not signed yet') || ddValue.includes('cheque ready')) {
                    cell.classList.add('status-green');
                } else if (ddValue.includes('despatched to lakki camp office ( aziz ullah api #03159853076 ) on 20/01/25')) {
                    cell.classList.add('status-red');
                } else if (ddValue.includes('sent to chairman sb. for sign')) {
                    cell.classList.add('status-blue');
                } else {
                    cell.classList.add('status-gray');
                }
            }

            row.appendChild(cell);
        });

        return row;
    }

    search() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const selectedCategory = this.narFilter.value.toLowerCase();
        console.log(`Searching for "${searchTerm}" in category "${selectedCategory}"...`);

        let matchCount = 0;
        this.tableBody.querySelectorAll('tr').forEach(row => {
            const narValue = row.getAttribute('data-nar');
            const matchesCategory = selectedCategory === "all" || narValue.includes(selectedCategory);
            const matchesSearch = Array.from(row.getElementsByTagName('td'))
                .some(cell => cell.textContent.toLowerCase().includes(searchTerm));

            row.style.display = matchesCategory && matchesSearch ? '' : 'none';
            if (matchesCategory && matchesSearch) matchCount++;
        });

        this.updateSearchResults(searchTerm, matchCount);
    }

    filterByNar() {
        const selectedCategory = this.narFilter.value.toLowerCase();
        console.log(`Filtering by NAR category: ${selectedCategory}`);
        this.tableBody.querySelectorAll('tr').forEach(row => {
            const narValue = row.getAttribute('data-nar');
            row.style.display = (selectedCategory === "all" || narValue.includes(selectedCategory)) ? '' : 'none';
        });
    }

    sortTable(columnIndex) {
        console.log(`Sorting table by column index: ${columnIndex}`);
        const rows = Array.from(this.tableBody.querySelectorAll('tr'));
        const columnKey = Object.keys(this.columns)[columnIndex];
        const columnType = this.columns[columnKey].type;

        rows.sort((a, b) => {
            const aValue = a.querySelectorAll('td')[columnIndex].textContent.trim();
            const bValue = b.querySelectorAll('td')[columnIndex].textContent.trim();

            if (columnType === 'number') {
                return parseFloat(aValue) - parseFloat(bValue);
            } else {
                return aValue.localeCompare(bValue);
            }
        });

        // Clear and re-append sorted rows
        this.tableBody.innerHTML = '';
        rows.forEach(row => this.tableBody.appendChild(row));
        console.log("Table sorted successfully.");
    }

    resetTable() {
        console.log("Resetting table...");
        this.searchInput.value = '';
        this.narFilter.value = 'all';
        this.tableContainer.style.display = 'none';
        this.emptyState.style.display = 'block';
        this.resultContainer.style.display = 'none';
        this.tableBody.querySelectorAll('tr').forEach(row => row.style.display = '');
    }

    updateSearchResults(searchTerm, matchCount) {
        console.log(`Updating search results. Found ${matchCount} matches.`);
        this.resultContainer.innerHTML = matchCount > 0
            ? `Found ${matchCount} results for "${searchTerm}"`
            : 'No results found.';
    }

    showError(message) {
        console.error(`Error: ${message}`);
        this.resultContainer.innerHTML = message;
        this.resultContainer.style.display = 'block';
    }
}

// Initialize the handler when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded. Initializing XMLTableHandler...");
    const handler = new XMLTableHandler();
    handler.fetchXMLData().then(() => handler.resetTable());
});

// Register service worker for offline capabilities
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/accounts.office.cheque.inquiry/service-worker.js', { scope: '/accounts.office.cheque.inquiry/' })
        .then(registration => console.log('ServiceWorker registered:', registration.scope))
        .catch(err => console.error('ServiceWorker registration failed:', err));
    });
}
