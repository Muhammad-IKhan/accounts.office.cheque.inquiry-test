class XMLTableHandler {
    constructor() {
        this.tableBody = document.getElementById('checksTable');
        this.searchInput = document.getElementById('search');
        this.tableContainer = document.getElementById('tableContainer');
        this.emptyState = document.getElementById('emptyState');
        this.resultContainer = document.getElementById('result');
        this.narFilter = document.getElementById('narCategory');

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
        this.xmlData = '';

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.searchInput.addEventListener('input', () => this.search());
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.search();
            if (e.key === 'Backspace' && this.tableResetEnabled) this.handleBackspace();
        });
        this.narFilter?.addEventListener('change', () => this.filterByNar());
    }

    async fetchXMLData() {
        try {
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
            localStorage.setItem('xmlData', combinedXML);
            this.xmlData = combinedXML;
            this.parseXMLToTable(combinedXML);
        } catch (error) {
            console.error('Error fetching XML:', error);
            const storedXML = localStorage.getItem('xmlData');
            if (storedXML) return this.parseXMLToTable(storedXML);
            this.showError('Failed to load XML data');
        }
    }

    parseXMLToTable(xmlString) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
            if (xmlDoc.querySelector('parsererror')) throw new Error('XML parsing error');
            const gPvnElements = xmlDoc.getElementsByTagName('G_PVN');
            this.tableBody.innerHTML = '';
            Array.from(gPvnElements).forEach(element => {
                this.tableBody.appendChild(this.createTableRow(element));
            });
            this.tableContainer.style.display = 'block';
            this.emptyState.style.display = 'none';
        } catch (error) {
            console.error('Error parsing XML:', error);
            this.showError('Failed to parse XML data');
        }
    }

    createTableRow(element) {
        const row = document.createElement('tr');
        row.setAttribute('data-nar', element.getElementsByTagName('NAR')[0]?.textContent?.trim().toLowerCase() || '');
        row.setAttribute('data-dd', element.getElementsByTagName('DD')[0]?.textContent?.trim().toLowerCase() || '');

        Object.keys(this.columns).forEach(field => {
            const cell = document.createElement('td');
            let value = element.getElementsByTagName(field)[0]?.textContent?.trim() || '';
            if (field === 'AMOUNT') value = parseFloat(value).toLocaleString('en-US');
            cell.textContent = value;
            this.applyStatusColors(cell, field, value);
            row.appendChild(cell);
        });
        return row;
    }

    applyStatusColors(cell, field, value) {
        if (field === 'DD') {
            const statusColors = {
                'despatched through gpo': 'status-orange',
                'cheque ready': 'status-green',
                'ready but not signed yet': 'status-green',
                'despatched to lakki camp office': 'status-red',
                'sent to chairman sb. for sign': 'status-blue',
            };
            Object.keys(statusColors).forEach(key => {
                if (value.toLowerCase().includes(key)) {
                    cell.classList.add(statusColors[key]);
                }
            });
        }
    }

    filterByNar() {
        const category = this.narFilter.value.toLowerCase();
        this.tableBody.querySelectorAll('tr').forEach(row => {
            const matches = row.getAttribute('data-nar').includes(category) || row.getAttribute('data-dd').includes(category);
            row.style.display = category === 'all' || matches ? '' : 'none';
        });
    }

    search() {
        const searchTerm = this.searchInput.value.toLowerCase();
        if (!searchTerm) return this.resetTable();
        this.tableBody.querySelectorAll('tr').forEach(row => {
            const matches = Array.from(row.getElementsByTagName('td')).some(cell => cell.textContent.toLowerCase().includes(searchTerm));
            row.style.display = matches ? '' : 'none';
        });
    }

    resetTable() {
        this.searchInput.value = '';
        this.narFilter.value = 'all';
        this.tableBody.querySelectorAll('tr').forEach(row => row.style.display = '');
    }

    handleBackspace() {
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
            if (inputAfter.length > 0) this.BackspaceDefault = true;
        }, 0);
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


