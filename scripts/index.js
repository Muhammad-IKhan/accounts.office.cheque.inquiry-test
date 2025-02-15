class XMLTableHandler {
    constructor() {
        this.tableBody = document.getElementById('checksTable');
        this.searchInput = document.getElementById('search');
        this.tableContainer = document.getElementById('tableContainer');
        this.emptyState = document.getElementById('emptyState');
        this.resultContainer = document.getElementById('result');
        this.narFilter = document.getElementById('narCategory');
        this.tableHeaders = document.querySelectorAll('#checksTable th');
        
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
        this.sortDirection = {};

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
                this.search();
            }
        });

        this.searchInput.addEventListener('input', () => {
            if (this.enableLiveUpdate) {
                this.search();
            }
        });

        this.narFilter.addEventListener('change', () => {
            this.filterByNar();
        });

        // Add sorting event listeners
        this.tableHeaders.forEach((header, index) => {
            header.addEventListener('click', () => this.sortTable(index));
        });
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

    parseXMLToTable(xmlString) {
        try {
            console.log("Parsing XML data...");
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "text/xml");
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

    search() {
        const searchTerm = this.searchInput.value.toLowerCase();
        if (!searchTerm) return this.resetTable();

        let matchCount = 0;
        this.tableBody.querySelectorAll('tr').forEach(row => {
            const narrationCell = row.cells[0];
            const matchesSearch = narrationCell.textContent.toLowerCase().includes(searchTerm);
            row.style.display = matchesSearch ? '' : 'none';
            if (matchesSearch) matchCount++;
        });

        this.updateSearchResults(searchTerm, matchCount);
    }

    sortTable(columnIndex) {
        const rows = Array.from(this.tableBody.querySelectorAll('tr'));
        const type = this.columns[Object.keys(this.columns)[columnIndex]].type;
        const direction = this.sortDirection[columnIndex] = !this.sortDirection[columnIndex];

        rows.sort((a, b) => {
            let aValue = a.cells[columnIndex].textContent.trim();
            let bValue = b.cells[columnIndex].textContent.trim();

            if (type === 'number') {
                aValue = parseFloat(aValue.replace(/,/g, '')) || 0;
                bValue = parseFloat(bValue.replace(/,/g, '')) || 0;
            }

            return direction ? aValue.localeCompare(bValue, undefined, { numeric: true }) : bValue.localeCompare(aValue, undefined, { numeric: true });
        });

        this.tableBody.innerHTML = '';
        rows.forEach(row => this.tableBody.appendChild(row));
    }

    resetTable() {
        this.searchInput.value = '';
        this.narFilter.value = 'all';
        this.tableBody.querySelectorAll('tr').forEach(row => row.style.display = '');
    }

    updateSearchResults(searchTerm, matchCount) {
        this.resultContainer.innerHTML = matchCount > 0
            ? `Found ${matchCount} results for "${searchTerm}"`
            : 'No results found.';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const handler = new XMLTableHandler();
    const dataLoaded = await handler.fetchXMLData();
    if (dataLoaded) handler.resetTable();
});
