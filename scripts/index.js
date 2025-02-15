class XMLTableHandler {
    constructor() {
        this.tableBody = document.getElementById('checksTable');
        this.searchInput = document.getElementById('search');
        this.tableContainer = document.getElementById('tableContainer');
        this.emptyState = document.getElementById('emptyState');
        this.resultContainer = document.getElementById('result');
        this.narFilter = document.getElementById('narCategory'); // Dropdown for filtering by <NAR>

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
        // Search input event listeners
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.search();
            }
        });

        this.searchInput.addEventListener('input', () => {
            if (this.enableLiveUpdate) {
                this.search();
            }
        });

        // Filtering by <NAR> category dropdown
        this.narFilter.addEventListener('change', () => {
            this.filterByNar();
        });
    }

    parseXMLToTable(xmlString = null) {
        try {
            console.log("Parsing XML data...");
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
            console.log("XML Data successfully parsed and displayed.");

            return true;
        } catch (error) {
            console.error('Error in parseXMLToTable:', error);
            this.showError('Failed to parse XML data');
            return false;
        }
    }

    createTableRow(element) {
        const row = document.createElement('tr');
        let narValue = element.getElementsByTagName('NAR')[0]?.textContent?.trim() || '';
        row.setAttribute('data-nar', narValue.toLowerCase()); // Store <NAR> for filtering

        Object.keys(this.columns).forEach(field => {
            const cell = document.createElement('td');
            let value = element.getElementsByTagName(field)[0]?.textContent?.trim() || '';

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
        try {
            console.log("Fetching XML data...");
            const filesResponse = await fetch('/accounts.office.cheque.inquiry/public/data/files.json');
            if (!filesResponse.ok) throw new Error(`HTTP error! Status: ${filesResponse.status}`);
            const xmlFiles = await filesResponse.json();

            let combinedXMLData = '<root>';
            for (const file of xmlFiles) {
                const fileResponse = await fetch(`accounts.office.cheque.inquiry/public/data/${file}`);
                if (!fileResponse.ok) throw new Error(`HTTP error for file: ${file}`);
                combinedXMLData += await fileResponse.text();
            }
            combinedXMLData += '</root>';

            localStorage.setItem('xmlData', combinedXMLData);
            this.xmlData = combinedXMLData;
            console.log("XML data fetched and stored successfully.");

            return this.parseXMLToTable(combinedXMLData);
        } catch (error) {
            console.error('Error fetching XML:', error);
            this.showError('Failed to load XML data');
            return false;
        }
    }

    search() {
        const searchTerm = this.searchInput.value.toLowerCase();
        if (!searchTerm) return this.resetTable();
        this.tableBody.querySelectorAll('tr').forEach(row => {
            const matchesSearch = Array.from(row.getElementsByTagName('td'))
                .some(cell => cell.textContent.toLowerCase().includes(searchTerm));
            row.style.display = matchesSearch ? '' : 'none';
        });
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

    showError(message) {
        this.resultContainer.innerHTML = message;
        this.resultContainer.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const handler = new XMLTableHandler();
    handler.fetchXMLData();
});


if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/accounts.office.cheque.inquiry/service-worker.js', { scope: '/accounts.office.cheque.inquiry/' })
        .then(registration => console.log('ServiceWorker registered:', registration.scope))
        .catch(err => console.error('ServiceWorker registration failed:', err));
    });
}

