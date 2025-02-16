class XMLTableHandler {
    constructor() {
        this.tableBody = document.getElementById('checksTable');
        this.searchInput = document.getElementById('search');
        this.narFilter = document.getElementById('narCategory');
        this.resultContainer = document.getElementById('result');
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
            NARRATION: 0,
            AMOUNT: 1,
            CHEQ_NO: 2,
            NAR: 3,
            DD: 4,
        };
        this.enableLiveUpdate = false;
        this.tableResetEnabled = true;
        this.BackspaceDefault = true;

        this.xmlData = '';
        this.initializeEventListeners();
    }
    
    /**
     * Initializes event listeners for search and filtering.
     */
    initializeEventListeners() {
        // Search input event listeners
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.search();
            }
        });
        this.searchInput.addEventListener('input', () => this.search());
        this.narFilter.addEventListener('change', () => this.filterByNar());
    }

        this.searchInput.addEventListener('input', () => {
            if (this.enableLiveUpdate) {
                this.search();
    /**
     * Fetch XML data and populate table.
     */
    async fetchXMLData() {
        try {
            console.log("Fetching XML data...");
            const response = await fetch('/accounts.office.cheque.inquiry/public/data/files.json');
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const files = await response.json();
            let combinedXML = '<root>';
            for (const file of files) {
                const fileResponse = await fetch(`/accounts.office.cheque.inquiry/public/data/${file}`);
                if (!fileResponse.ok) throw new Error(`Error fetching ${file}`);
                combinedXML += await fileResponse.text();
            }
        });
            combinedXML += '</root>';

        // Filtering by <NAR> category dropdown
        this.narFilter.addEventListener('change', () => {
            this.filterByNar();
        });
            this.xmlData = combinedXML;
            localStorage.setItem('xmlData', combinedXML);
            console.log("XML data fetched and stored successfully.");
            this.parseXMLToTable(combinedXML);
        } catch (error) {
            console.error('Error fetching XML:', error);
            this.showError('Failed to load XML data');
        }
    }

    parseXMLToTable(xmlString = null) {
    /**
     * Parses XML and populates the table.
     */
    parseXMLToTable(xmlString) {
        try {
            console.log("Parsing XML data...");
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString || this.xmlData, "text/xml");
            if (xmlDoc.querySelector('parsererror')) {
                throw new Error('XML parsing error');
            }
            const xmlDoc = parser.parseFromString(xmlString, "text/xml");
            if (xmlDoc.querySelector('parsererror')) throw new Error('XML parsing error');
            
            const gPvnElements = xmlDoc.getElementsByTagName('G_PVN');
            if (!this.tableBody) {
                throw new Error('Table body element not found');
            }
            this.tableBody.innerHTML = '';
            Array.from(gPvnElements).forEach((element) => {
            
            Array.from(gPvnElements).forEach(element => {
                const row = this.createTableRow(element);
                this.tableBody.appendChild(row);
            });
            console.log("XML Data successfully parsed and displayed.");

            return true;
            this.tableContainer.style.display = 'block';
            this.emptyState.style.display = 'none';
        } catch (error) {
            console.error('Error in parseXMLToTable:', error);
            this.showError('Failed to parse XML data');
            return false;
        }
    }
    
    /**
     * Creates a table row from XML data.
     */
    createTableRow(element) {
        const row = document.createElement('tr');
        let narValue = element.getElementsByTagName('NAR')[0]?.textContent?.trim() || '';
        row.setAttribute('data-nar', narValue.toLowerCase()); // Store <NAR> for filtering
        let ddValue = element.getElementsByTagName('DD')[0]?.textContent?.trim().toLowerCase() || '';
        row.setAttribute('data-dd', ddValue); // Store <DD> for filtering
        row.setAttribute('data-nar', element.getElementsByTagName('NAR')[0]?.textContent?.trim().toLowerCase() || '');
        row.setAttribute('data-dd', element.getElementsByTagName('DD')[0]?.textContent?.trim().toLowerCase() || '');

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
            if (field === 'AMOUNT') value = parseFloat(value).toLocaleString('en-US');
            cell.textContent = value;
            cell.setAttribute('data-field', field);
            if (field === 'DD') {
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
                const fileResponse = await fetch(`/accounts.office.cheque.inquiry/public/data/${file}`);
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
    
    /**
     * Filters rows based on the selected <NAR> category.
     */
    filterByNar() {
        const category = this.narFilter.value.toLowerCase();
        this.tableBody.querySelectorAll('tr').forEach(row => {
            const matches = row.getAttribute('data-nar').includes(category) || row.getAttribute('data-dd').includes(category);
            row.style.display = category === "all" || matches ? '' : 'none';
        });
    }
    
    /**
     * Searches table rows for matching text in all categories.
     */
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
            const matches = Array.from(row.getElementsByTagName('td')).some(cell => cell.textContent.toLowerCase().includes(searchTerm));
            row.style.display = matches ? '' : 'none';
        });
    }
    
    /**
     * Resets the table to show all rows.
     */
    resetTable() {
        this.searchInput.value = '';
        this.narFilter.value = 'all';
        this.tableBody.querySelectorAll('tr').forEach(row => row.style.display = '');
    }
    
    /**
     * Displays an error message.
     */
    showError(message) {
        this.resultContainer.innerHTML = message;
        this.resultContainer.style.display = 'block';
@@ -178,6 +149,7 @@ document.addEventListener('DOMContentLoaded', () => {
    handler.fetchXMLData();
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/accounts.office.cheque.inquiry/service-worker.js', { scope: '/accounts.office.cheque.inquiry/' })
