class XMLTableHandler {
     constructor() {
        this.tableBody = document.getElementById('checksTable');
        this.searchInput = document.getElementById('search');
        this.narFilter = document.getElementById('narCategory');
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
        this.sortColumn = null;
        this.sortOrder = 'asc';

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
            if (e.key === 'Enter') {
                this.search();
            }
        });

        this.searchInput.addEventListener('input', () => {
            if (this.enableLiveUpdate) {
                this.search();
            }
        });

        this.narFilter.addEventListener('change', () => this.filterByNar());

        // Sorting event listeners
        const tableHeaderCells = this.tableBody.querySelectorAll('th');
        tableHeaderCells.forEach(headerCell => {
            headerCell.addEventListener('click', () => {
                const columnName = headerCell.getAttribute('data-field');
                if (columnName) {
                    this.sortTable(columnName);
                }
            });
        });
    }

    async fetchXMLData() {
        try {
            const filesResponse = await fetch('/accounts.office.cheque.inquiry/public/data/files.json'); // Correct path
            if (!filesResponse.ok) throw new Error(`HTTP error! Status: ${filesResponse.status}`);
            const xmlFiles = await filesResponse.json();
            let combinedXMLData = '<root>';
            for (const file of xmlFiles) {
                const fileResponse = await fetch(`/accounts.office.cheque.inquiry/public/data/${file}`); // Correct path
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

    parseXMLToTable(xmlString = null) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString || this.xmlData, "text/xml");
            if (xmlDoc.querySelector('parsererror')) {
                const parserError = xmlDoc.querySelector('parsererror');
                console.error("XML Parsing Error:", parserError.textContent); // Log detailed error
                throw new Error('XML parsing error');
            }

            const gPvnElements = xmlDoc.getElementsByTagName('G_PVN');
            if (!this.tableBody) throw new Error('Table body element not found');

            this.tableBody.innerHTML = '';
            Array.from(gPvnElements).forEach((element) => {
                const row = this.createTableRow(element);
                this.tableBody.appendChild(row);
            });

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
                    console.warn(`Invalid amount value: ${value}`, error); // Include the error object
                    value = '0';
                }
            }

            cell.textContent = value;
            cell.setAttribute('data-field', field);

            if (field === 'DD') {
                let ddValue = value.toLowerCase();
                // ... (Existing DD status styling code)
            }

            row.appendChild(cell);
        });

        return row;
    }
    
    search() {
        const searchTerm = this.searchInput.value.toLowerCase();
        console.log("Searching for:", searchTerm); // Log the search term

        // If search is empty, show all rows and reset the table
        if (!searchTerm) {
            this.resetTable();  // Call resetTable to show all rows and clear search state
            return;
        }

        this.tableContainer.style.display = 'block';
        this.emptyState.style.display = 'none';
        this.resultContainer.style.display = 'block';
        let matchCount = 0;

        this.tableBody.querySelectorAll('tr').forEach(row => {
            const matchesSearch = Array.from(row.getElementsByTagName('td'))
                .some(cell => cell.textContent.toLowerCase().includes(searchTerm));

            // Apply both search and filter
            const selectedCategory = this.narFilter.value.toLowerCase();
            const narValue = row.getAttribute('data-nar');
            const isVisibleByFilter = selectedCategory === "all" || (narValue && narValue.includes(selectedCategory));

            const isVisible = matchesSearch && isVisibleByFilter; // Both conditions must be true
            row.style.display = isVisible ? '' : 'none';

            if (isVisible) {
                matchCount++;
            }
        });

        this.updateSearchResults(searchTerm, matchCount);
    }



    filterByNar() {
        const selectedCategory = this.narFilter.value.toLowerCase();
        console.log("Filtering by NAR:", selectedCategory);

        const searchTerm = this.searchInput.value.toLowerCase(); // Get current search term

        this.tableBody.querySelectorAll('tr').forEach(row => {
            const narValue = row.getAttribute('data-nar');
            const isVisibleByFilter = selectedCategory === "all" || (narValue && narValue.includes(selectedCategory));

            let isVisibleBySearch = true; // Default to true if no search term

            if (searchTerm) {
                isVisibleBySearch = Array.from(row.getElementsByTagName('td'))
                    .some(cell => cell.textContent.toLowerCase().includes(searchTerm));
            }

            const isVisible = isVisibleByFilter && isVisibleBySearch; // Combine filter and search
            row.style.display = isVisible ? '' : 'none';
            console.log(`Row with NAR: ${narValue} is ${isVisible ? 'visible' : 'hidden'} after filtering`);
        });
    }


    resetTable() {
        this.searchInput.value = '';
        this.narFilter.value = 'all';
        this.tableContainer.style.display = 'none';
        this.emptyState.style.display = 'block';
        this.resultContainer.style.display = 'none';
        this.tableBody.querySelectorAll('tr').forEach(row => row.style.display = '');
        this.sortColumn = null;
        this.sortOrder = 'asc';

        // Crucial: Clear any previous search state
        this.search(); // Call search with empty string to show all
    }

}



    // filterByNar() {
    //     const selectedCategory = this.narFilter.value.toLowerCase();
    //     console.log("Selected NAR Category:", selectedCategory);

    //     this.tableBody.querySelectorAll('tr').forEach(row => {
    //         const narValue = row.getAttribute('data-nar');
    //         const isVisible = selectedCategory === "all" || (narValue && narValue.includes(selectedCategory));
    //         row.style.display = isVisible ? '' : 'none';
    //         console.log(`Row with NAR: ${narValue} is ${isVisible ? 'visible' : 'hidden'}`);
    //     });
    // }

    sortTable(columnName) {
        console.log("Sorting by:", columnName);

        if (this.sortColumn === columnName) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = columnName;
            this.sortOrder = 'asc';
        }

        const rows = Array.from(this.tableBody.querySelectorAll('tr'));

        rows.sort((a, b) => {
            const aValue = a.querySelector(`td[data-field="${columnName}"]`)?.textContent?.trim() || '';
            const bValue = b.querySelector(`td[data-field="${columnName}"]`)?.textContent?.trim() || '';

            let comparison = 0;

            if (this.columns[columnName]?.type === 'number') {
                const numA = parseFloat(aValue) || 0;
                const numB = parseFloat(bValue) || 0;
                comparison = numA - numB;
            } else {
                comparison = aValue?.localeCompare(bValue) || 0;
            }

            return this.sortOrder === 'asc' ? comparison : -comparison;
        });

        this.tableBody.innerHTML = ''; // Clear the table body before adding sorted rows
        rows.forEach(row => this.tableBody.appendChild(row));

        console.log("Sorting complete.");
    }


filterByNar() {
        const selectedCategory = this.narFilter.value.toLowerCase();
        console.log("Filtering by NAR:", selectedCategory);

        const searchTerm = this.searchInput.value.toLowerCase(); // Get current search term

        this.tableBody.querySelectorAll('tr').forEach(row => {
            const narValue = row.getAttribute('data-nar');
            const isVisibleByFilter = selectedCategory === "all" || (narValue && narValue.includes(selectedCategory));

            let isVisibleBySearch = true; // Default to true if no search term

            if (searchTerm) {
                isVisibleBySearch = Array.from(row.getElementsByTagName('td'))
                    .some(cell => cell.textContent.toLowerCase().includes(searchTerm));
            }

            const isVisible = isVisibleByFilter && isVisibleBySearch; // Combine filter and search
            row.style.display = isVisible ? '' : 'none';
            console.log(`Row with NAR: ${narValue} is ${isVisible ? 'visible' : 'hidden'} after filtering`);
        });
    }


    resetTable() {
        this.searchInput.value = '';
        this.narFilter.value = 'all';
        this.tableContainer.style.display = 'none';
        this.emptyState.style.display = 'block';
        this.resultContainer.style.display = 'none';
        this.tableBody.querySelectorAll('tr').forEach(row => row.style.display = '');
        this.sortColumn = null;
        this.sortOrder = 'asc';

        // Crucial: Clear any previous search state
        this.search(); // Call search with empty string to show all
    }



    // resetTable() {
    //     this.searchInput.value = '';
    //     this.narFilter.value = 'all';
    //     this.tableContainer.style.display = 'none';
    //     this.emptyState.style.display = 'block';
    //     this.resultContainer.style.display = 'none';
    //     this.tableBody.querySelectorAll('tr').forEach(row => row.style.display = ''); // Show all rows
    //     this.sortColumn = null; // Reset sort column
    //     this.sortOrder = 'asc'; // Reset sort order
    // }

    updateSearchResults(searchTerm, matchCount) {
        this.resultContainer.innerHTML = matchCount > 0
            ? `Found ${matchCount} results for "${searchTerm}"`
            : 'No results found.';
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
        navigator.serviceWorker.register('/accounts.office.cheque.inquiry/service-worker.js', { scope: '/accounts.office.cheque.inquiry/' }) // Correct path
            .then(registration => console.log('ServiceWorker registered:', registration.scope))
            .catch(err => console.error('ServiceWorker registration failed:', err));
    });
}
