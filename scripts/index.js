/**
 * XMLTableHandler: Handles XML parsing, table rendering, searching, and filtering.
 */
class XMLTableHandler {
    constructor() {
        this.tableBody = document.getElementById('checksTable');
        this.searchInput = document.getElementById('search');
        this.narFilter = document.getElementById('narCategory');
        this.resultContainer = document.getElementById('result');
        this.tableContainer = document.getElementById('tableContainer');
        this.emptyState = document.getElementById('emptyState');
        
        this.columns = {
            NARRATION: 0,
            AMOUNT: 1,
            CHEQ_NO: 2,
            NAR: 3,
            DD: 4,
        };
        
        this.xmlData = '';
        this.initializeEventListeners();
    }
    
    /**
     * Initializes event listeners for search and filtering.
     */
    initializeEventListeners() {
        this.searchInput.addEventListener('input', () => this.search());
        this.narFilter.addEventListener('change', () => this.filterByNar());
    }

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
            combinedXML += '</root>';

            this.xmlData = combinedXML;
            localStorage.setItem('xmlData', combinedXML);
            console.log("XML data fetched and stored successfully.");
            this.parseXMLToTable(combinedXML);
        } catch (error) {
            console.error('Error fetching XML:', error);
            this.showError('Failed to load XML data');
        }
    }

    /**
     * Parses XML and populates the table.
     */
    parseXMLToTable(xmlString) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "text/xml");
            if (xmlDoc.querySelector('parsererror')) throw new Error('XML parsing error');
            
            const gPvnElements = xmlDoc.getElementsByTagName('G_PVN');
            this.tableBody.innerHTML = '';
            
            Array.from(gPvnElements).forEach(element => {
                const row = this.createTableRow(element);
                this.tableBody.appendChild(row);
            });

            this.tableContainer.style.display = 'block';
            this.emptyState.style.display = 'none';
        } catch (error) {
            console.error('Error in parseXMLToTable:', error);
            this.showError('Failed to parse XML data');
        }
    }
    
    /**
     * Creates a table row from XML data.
     */
    createTableRow(element) {
        const row = document.createElement('tr');
        row.setAttribute('data-nar', element.getElementsByTagName('NAR')[0]?.textContent?.trim().toLowerCase() || '');
        row.setAttribute('data-dd', element.getElementsByTagName('DD')[0]?.textContent?.trim().toLowerCase() || '');

        Object.keys(this.columns).forEach(field => {
            const cell = document.createElement('td');
            let value = element.getElementsByTagName(field)[0]?.textContent?.trim() || '';
            if (field === 'AMOUNT') value = parseFloat(value).toLocaleString('en-US');
            cell.textContent = value;
            row.appendChild(cell);
        });

        return row;
    }
    
    /**
     * Filters rows based on the selected <NAR> category.
     */
    filterByNar() {
        const category = this.narFilter.value.toLowerCase();
        console.log(`Filtering by category: ${category}`);
        
        this.tableBody.querySelectorAll('tr').forEach(row => {
            const categoryText = row.getAttribute('data-nar');
            const matches = categoryText.includes(category);
            
            // Special handling for "SUPERVISORY STAFF EXAM"
            if (category === "supervisory staff exam") {
                if (categoryText.includes("supervisory staff ssc exam") || categoryText.includes("supervisory staff hssc exam")) {
                    row.style.display = "";
                } else {
                    row.style.display = "none";
                }
            } else {
                row.style.display = category === "all" || matches ? "" : "none";
            }
        });
    }
    
    /**
     * Searches table rows for matching text in all categories.
     */
    search() {
        const searchTerm = this.searchInput.value.toLowerCase();
        console.log(`Searching for: ${searchTerm}`);
        if (!searchTerm) return this.resetTable();
        
        this.tableBody.querySelectorAll('tr').forEach(row => {
            const matches = Array.from(row.getElementsByTagName('td')).some(cell => cell.textContent.toLowerCase().includes(searchTerm));
            row.style.display = matches ? '' : 'none';
        });
    }
    
    /**
     * Resets the table to show all rows.
     */
    resetTable() {
        console.log("Resetting table...");
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
