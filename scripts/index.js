// THIS REPLIT CODE IS BEST WORKING FOR SERACHING FILTERING SORTING BUT NEED COLORING AND PAGINATION
class XMLTableHandler {
    constructor() {
        this.tableBody = document.getElementById('checksTable');
        this.searchInput = document.getElementById('search');
        this.tableContainer = document.getElementById('tableContainer');
        this.emptyState = document.getElementById('emptyState');
        this.resultContainer = document.getElementById('result');
        this.narFilter = document.getElementById('narCategory');
        this.searchBtn = document.getElementById('searchBtn');

        // Define columns for sorting
        this.columns = {
            NARRATION: { index: 0, type: 'string' },
            AMOUNT: { index: 1, type: 'number' },
            CHEQ_NO: { index: 2, type: 'number' },
            NAR: { index: 3, type: 'string' },
            DD: { index: 4, type: 'string' }
        };

        this.sortState = {
            column: '',
            ascending: true
        };

        this.enableLiveUpdate = false;
        this.tableResetEnabled = true;
        this.BackspaceDefault = true;

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Search and filter events
        this.searchInput.addEventListener('keydown', this.handleKeyDown.bind(this));
        this.searchBtn.addEventListener('click', () => this.search());
        this.narFilter.addEventListener('change', () => this.search());

        // Add sorting event listeners to table headers
        document.querySelectorAll('th[data-column]').forEach(header => {
            header.addEventListener('click', () => {
                const column = header.getAttribute('data-column');
                if (column) this.sortTable(column);
            });
        });
    }

    handleKeyDown(e) {
        if (e.key === 'Enter') {
            this.search();
        }

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
    }

    sortTable(column) {
        const rows = Array.from(this.tableBody.getElementsByTagName('tr'));
        const type = this.columns[column].type;
        const ascending = this.sortState.column === column ? !this.sortState.ascending : true;

        rows.sort((a, b) => {
            let aValue = a.querySelector(`td[data-field="${column}"]`).textContent.trim();
            let bValue = b.querySelector(`td[data-field="${column}"]`).textContent.trim();

            if (type === 'number') {
                aValue = parseFloat(aValue.replace(/,/g, '')) || 0;
                bValue = parseFloat(bValue.replace(/,/g, '')) || 0;
            }

            if (aValue < bValue) return ascending ? -1 : 1;
            if (aValue > bValue) return ascending ? 1 : -1;
            return 0;
        });

        // Update sort icons
        document.querySelectorAll('th[data-column] .sort-icon').forEach(icon => {
            icon.textContent = '';
        });

        const currentHeader = document.querySelector(`th[data-column="${column}"]`);
        const sortIcon = currentHeader.querySelector('.sort-icon');
        sortIcon.textContent = ascending ? ' ↑' : ' ↓';

        // Update sort state
        this.sortState = { column, ascending };

        // Clear and re-append rows
        while (this.tableBody.firstChild) {
            this.tableBody.removeChild(this.tableBody.firstChild);
        }
        rows.forEach(row => this.tableBody.appendChild(row));
    }

    getStatusColor(status) {
        const lowerStatus = status.toLowerCase();
        if (lowerStatus.includes('despatched through gpo')) {
            return 'status-orange';
        }
        if (lowerStatus.includes('ready but not signed yet') || 
            lowerStatus.includes('cheque ready')) {
            return 'status-green';
        }
        if (lowerStatus.includes('despatched to lakki camp office')) {
            return 'status-red';
        }
        if (lowerStatus.includes('sent to chairman')) {
            return 'status-blue';
        }
        if (lowerStatus.includes('expired')) {
            return 'status-purple';
        }
        if (lowerStatus.includes('cancelled') || 
            lowerStatus.includes('rejected')) {
            return 'status-dark-red';
        }
        if (lowerStatus.includes('on hold')) {
            return 'status-yellow';
        }
        if (lowerStatus.includes('processing')) {
            return 'status-cyan';
        }
        return 'status-gray';
    }

    parseXMLToTable(xmlString = null) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString || this.xmlData, "text/xml");

            if (xmlDoc.querySelector('parsererror')) {
                console.error('XML parsing error:', xmlDoc.querySelector('parsererror').textContent);
                throw new Error('XML parsing error');
            }

            const entries = xmlDoc.getElementsByTagName('G_PVN');
            this.tableBody.innerHTML = '';

            Array.from(entries).forEach((element) => {
                const row = this.createTableRow(element);
                this.tableBody.appendChild(row);
            });

            return true;
        } catch (error) {
            console.error('Error in parseXMLToTable:', error);
            this.showError('Failed to parse XML data');
            return false;
        }
    }

    createTableRow(element) {
        const row = document.createElement('tr');
        row.setAttribute('data-nar', element.getElementsByTagName('NAR')[0]?.textContent?.trim().toLowerCase() || '');

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
                const statusClass = this.getStatusColor(value);
                cell.className = statusClass;
            }

            row.appendChild(cell);
        });

        return row;
    }

    async fetchXMLData() {
        try {
            const filesResponse = await fetch('/accounts.office.cheque.inquiry/public/data/files.json');
            if (!filesResponse.ok) throw new Error(`HTTP error! Status: ${filesResponse.status}`);
            const xmlFiles = await filesResponse.json();

            let combinedXML = '<root>';

            for (const file of xmlFiles) {
                const fileResponse = await fetch(`/accounts.office.cheque.inquiry/public/data/${file}`);
                if (!fileResponse.ok) throw new Error(`HTTP error for file: ${file}`);
                let xmlContent = await fileResponse.text();
                // Remove XML declaration and root tags from individual files
                xmlContent = xmlContent.replace(/<\?xml[^>]+\?>/, '');
                xmlContent = xmlContent.replace(/<\/?root>/g, '');
                combinedXML += xmlContent;
            }
            combinedXML += '</root>';

            console.log('Combined XML:', combinedXML); // Debug log
            localStorage.setItem('xmlData', combinedXML);
            this.xmlData = combinedXML;
            return this.parseXMLToTable(combinedXML);
        } catch (error) {
            console.error('Error fetching XML:', error);
            const storedXML = localStorage.getItem('xmlData');
            if (storedXML) {
                console.log('Using cached XML data');
                return this.parseXMLToTable(storedXML);
            }
            this.showError('Failed to load XML data');
            return false;
        }
    }

    search() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const selectedCategory = this.narFilter.value.toLowerCase();

        if (!searchTerm && selectedCategory === 'all') {
            return this.resetTable();
        }

        this.tableContainer.style.display = 'block';
        this.emptyState.style.display = 'none';
        this.resultContainer.style.display = 'block';

        let matchCount = 0;
        this.tableBody.querySelectorAll('tr').forEach(row => {
            const narValue = row.getAttribute('data-nar');
            const cells = Array.from(row.getElementsByTagName('td'));

            const matchesCategory = selectedCategory === 'all' || narValue.includes(selectedCategory);
            const matchesSearch = !searchTerm || cells.some(cell =>
                cell.textContent.toLowerCase().includes(searchTerm)
            );

            const visible = matchesCategory && matchesSearch;
            row.style.display = visible ? '' : 'none';
            if (visible) matchCount++;
        });

        this.updateSearchResults(searchTerm, selectedCategory, matchCount);
    }

    updateSearchResults(searchTerm, category, matchCount) {
        let message = '';
        if (searchTerm && category !== 'all') {
            message = `Found ${matchCount} results for "${searchTerm}" in category "${this.narFilter.options[this.narFilter.selectedIndex].text}"`;
        } else if (searchTerm) {
            message = `Found ${matchCount} results for "${searchTerm}" in all categories`;
        } else if (category !== 'all') {
            message = `Found ${matchCount} results in category "${this.narFilter.options[this.narFilter.selectedIndex].text}"`;
        }

        this.resultContainer.textContent = matchCount > 0 ? message : 'No results found.';
    }

    resetTable() {
        this.searchInput.value = '';
        this.narFilter.value = 'all';
        this.tableContainer.style.display = 'none';
        this.emptyState.style.display = 'block';
        this.resultContainer.style.display = 'none';
        this.tableBody.querySelectorAll('tr').forEach(row => row.style.display = '');
    }

    showError(message) {
        this.resultContainer.textContent = message;
        this.resultContainer.style.display = 'block';
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const handler = new XMLTableHandler();
    handler.fetchXMLData().then(() => handler.resetTable());
});

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/accounts.office.cheque.inquiry/service-worker.js', {
            scope: '/accounts.office.cheque.inquiry/'
        })
            .then(registration => console.log('ServiceWorker registered:', registration.scope))
            .catch(err => console.error('ServiceWorker registration failed:', err));
    });
}
