class XMLTableHandler {
    constructor() {
        console.log("XMLTableHandler constructed.");
        this.tableBody = document.getElementById('checksTable');
        this.searchInput = document.getElementById('search');
        this.tableContainer = document.getElementById('tableContainer');
        this.emptyState = document.getElementById('emptyState');
        this.resultContainer = document.getElementById('result');
        this.narFilter = document.getElementById('narCategory');
        this.xmlData = ''; // Initialize xmlData to an empty string

        this.columns = {
            NARRATION: { index: 0, type: 'string' },
            AMOUNT: { index: 1, type: 'number' },
            CHEQ_NO: { index: 2, type: 'number' },
            NAR: { index: 3, type: 'string' },
            DD: { index: 4, type: 'string' },
        };

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        console.log("Initializing event listeners.");
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                console.log("Enter key pressed in search input.");
                this.search();
            }
        });

        this.searchInput.addEventListener('input', () => {
             console.log("Input changed in search input.");
            // Consider debouncing here for large datasets to improve performance
            this.search();
        });

        this.narFilter.addEventListener('change', () => {
            console.log("NAR filter dropdown changed.");
            this.filterByNar();
        });
    }

    parseXMLToTable(xmlString = null) {
        console.log("Parsing XML data...");
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString || this.xmlData, "text/xml");

            if (xmlDoc.querySelector('parsererror')) {
                const errorText = xmlDoc.querySelector('parsererror').textContent;
                console.error('XML parsing error:', errorText);  // Log the detailed error
                throw new Error('XML parsing error: ' + errorText);
            }

            const gPvnElements = xmlDoc.getElementsByTagName('G_PVN');
            if (!this.tableBody) {
                throw new Error('Table body element not found');
            }

            this.tableBody.innerHTML = ''; // Clear table before populating
            console.log(`Found ${gPvnElements.length} G_PVN elements.`);

            Array.from(gPvnElements).forEach((element, index) => {
                const row = this.createTableRow(element);
                this.tableBody.appendChild(row);
                console.log(`Added row ${index + 1} to the table.`);
            });

            if (gPvnElements.length === 0) {
                this.tableBody.innerHTML = '<tr><td colspan="5">No data available</td></tr>';
                console.log("No data available to display.");
            }

            console.log("XML Data successfully parsed and displayed.");
            return true;
        } catch (error) {
            console.error('Error in parseXMLToTable:', error);
            this.showError('Failed to parse XML data: ' + error.message); // Show the error message
            return false;
        }
    }

    createTableRow(element) {
        const row = document.createElement('tr');
        let narValue = element.getElementsByTagName('NAR')[0]?.textContent?.trim() || '';
        row.setAttribute('data-nar', narValue.toLowerCase());

        Object.keys(this.columns).forEach(field => {
            const cell = document.createElement('td');
            let value = element.getElementsByTagName(field)[0]?.textContent?.trim() || '';

            if (field === 'AMOUNT') {
                try {
                    value = parseFloat(value).toLocaleString('en-US');
                } catch (error) {
                    console.warn(`Invalid amount value: ${value}. Setting to 0. Error:`, error);
                    value = '0';
                }
            }

            cell.textContent = value;
            cell.setAttribute('data-field', field);

            if (field === 'DD') {
                let ddValue = value.toLowerCase();
                if (ddValue.includes('ready but not signed yet')) {
                    cell.classList.add('status-orange');
                } else if (ddValue.includes('cheque ready')) {
                    cell.classList.add('status-green');
                } else if (ddValue.includes('pending')) {
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

    async fetchXMLData() {
        console.log("Fetching XML data...");
        try {
            const filesResponse = await fetch('/accounts.office.cheque.inquiry/public/data/files.json');
            if (!filesResponse.ok) {
                const errorText = await filesResponse.text(); // Get error details from server if available
                throw new Error(`HTTP error! Status: ${filesResponse.status}, Details: ${errorText}`);
            }

            const xmlFiles = await filesResponse.json();
            console.log(`Found ${xmlFiles.length} XML files to fetch.`);

            let combinedXMLData = '<root>';
            for (const file of xmlFiles) {
                console.log(`Fetching XML data from: ${file}`);
                const fileResponse = await fetch(`/accounts.office.cheque.inquiry/public/data/${file}`);
                if (!fileResponse.ok) {
                    const errorText = await fileResponse.text();
                    throw new Error(`HTTP error for file: ${file}. Status: ${fileResponse.status}, Details: ${errorText}`);
                }
                combinedXMLData += await fileResponse.text();
            }
            combinedXMLData += '</root>';

            localStorage.setItem('xmlData', combinedXMLData);
            this.xmlData = combinedXMLData;
            console.log("XML data fetched and stored successfully.");

            return this.parseXMLToTable(combinedXMLData);
        } catch (error) {
            console.error('Error fetching XML:', error);
            this.showError('Failed to load XML data: ' + error.message); // Display specific error
            return false;
        }
    }


   ssearch() {
    const searchTerm = this.searchInput.value.toLowerCase();
    console.log(`Searching for: "${searchTerm}"`);

    const rows = this.tableBody.querySelectorAll('tr');

    if (!searchTerm) {
        // Show ALL rows when search term is empty
        rows.forEach(row => {
            row.style.display = ""; // or row.classList.remove('hidden')
        });
        console.log("Search term empty. Showing all rows.");
        return;
    }

    rows.forEach(row => {
        let matchesSearch = false;
        const cells = row.querySelectorAll('td');

        for (const cell of cells) {
            if (cell.textContent.toLowerCase().includes(searchTerm)) {
                matchesSearch = true;
                break;
            }
        }

        // The crucial fix is here:
        row.style.display = matchesSearch ? "" : "none"; // Show or hide based on match

    });

    console.log("Search complete.");
}

    filterByNar() {
        const selectedCategory = this.narFilter.value.toLowerCase();
        this.tableBody.querySelectorAll('tr').forEach(row => {
            const narValue = row.getAttribute('data-nar');
            row.style.display = (selectedCategory === "all" || narValue.includes(selectedCategory)) ? '' : 'none';
        });
    }

    resetTable() {
        this.searchInput.value = '';
        this.narFilter.value = 'all';
        this.tableBody.querySelectorAll('tr').forEach(row => row.style.display = '');
    }

    
    // showError(message) {
    //     this.resultContainer.innerHTML = `<div class="error-message">${message}</div>`; // Add a class for styling
    //     this.resultContainer.style.display = 'block';
    // }

    showError(message) {
        console.error("Showing error:", message); // Log the error to the console as well
        this.resultContainer.innerHTML = `<div class="error-message">${message}</div>`;
        this.resultContainer.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM content loaded.");
    const handler = new XMLTableHandler();
    const success = await handler.fetchXMLData();
    if (!success) {
        console.error("Initial XML data fetch failed.");
        handler.showError("Failed to load data. Please try again later.");
        return;
    }
    console.log("Initial XML data fetch successful.");
});


if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/accounts.office.cheque.inquiry/service-worker.js', { scope: '/accounts.office.cheque.inquiry/' })
        .then(registration => console.log('ServiceWorker registered:', registration.scope))
        .catch(err => console.error('ServiceWorker registration failed:', err));
    });
}
