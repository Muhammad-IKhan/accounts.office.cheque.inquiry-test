class XMLTableHandler {
    constructor() {
        this.tableBody = document.getElementById('checksTable');
        this.searchInput = document.getElementById('search');
        this.tableContainer = document.getElementById('tableContainer');
        this.emptyState = document.getElementById('emptyState');
        this.resultContainer = document.getElementById('result');
        this.narFilter = document.getElementById('narCategory');
        this.tableHeaders = document.querySelectorAll('#checksTable thead th');

        this.columns = {
            NARRATION: { index: 0, type: 'string' },
            AMOUNT: { index: 1, type: 'number' },
            CHEQ_NO: { index: 2, type: 'number' },
            NAR: { index: 3, type: 'string' },
            DD: { index: 4, type: 'string' },
        };

        this.currentSort = { column: null, ascending: true };
        this.enableLiveUpdate = false;
        this.tableResetEnabled = true;
        this.BackspaceDefault = true;

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.searchInput.addEventListener('input', () => {
            if (this.enableLiveUpdate) {
                this.search();
            }
        });

        this.narFilter.addEventListener('change', () => {
            this.search(); // Apply both search and filter together
        });

        this.tableHeaders.forEach((header, index) => {
            header.addEventListener('click', () => this.sortTable(index));
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
        row.setAttribute('data-nar', narValue.toLowerCase());

        Object.keys(this.columns).forEach(field => {
            const cell = document.createElement('td');
            let value = element.getElementsByTagName(field)[0]?.textContent?.trim() || '';

            if (field === 'AMOUNT') {
                value = isNaN(value) ? '0' : parseFloat(value).toLocaleString('en-US');
            }

            cell.textContent = value;
            cell.setAttribute('data-field', field);
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
            const storedXML = localStorage.getItem('xmlData');
            if (storedXML) return this.parseXMLToTable(storedXML);
            this.showError('Failed to load XML data');
            return false;
        }
    }

    search() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const selectedCategory = this.narFilter.value.toLowerCase();
        let matchCount = 0;

        this.tableBody.querySelectorAll('tr').forEach(row => {
            const narrationText = row.cells[this.columns.NARRATION.index].textContent.toLowerCase();
            const narValue = row.getAttribute('data-nar');
            
            const matchesSearch = narrationText.includes(searchTerm);
            const matchesCategory = selectedCategory === "all" || narValue.includes(selectedCategory);
            
            row.style.display = matchesSearch && matchesCategory ? '' : 'none';
            if (matchesSearch && matchesCategory) matchCount++;
        });

        this.updateSearchResults(searchTerm, matchCount);
    }

    updateSearchResults(searchTerm, matchCount) {
        this.resultContainer.innerHTML = matchCount > 0
            ? `Found ${matchCount} results for "${searchTerm}"`
            : 'No results found.';
    }

    sortTable(index) {
        const rows = Array.from(this.tableBody.querySelectorAll('tr'));
        const isAscending = this.currentSort.column === index ? !this.currentSort.ascending : true;
        this.currentSort = { column: index, ascending: isAscending };

        rows.sort((a, b) => {
            const aValue = a.cells[index].textContent.trim();
            const bValue = b.cells[index].textContent.trim();
            return isAscending ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        });

        this.tableBody.innerHTML = '';
        rows.forEach(row => this.tableBody.appendChild(row));
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
