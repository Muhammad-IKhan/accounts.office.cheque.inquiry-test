class XMLTableHandler {
    constructor() {
        this.tableBody = document.getElementById('checksTable');
        this.searchInput = document.getElementById('search');
        this.tableContainer = document.querySelector('.table-container');
        this.emptyState = document.getElementById('emptyState');
        this.stats = {
            totalCheques: document.getElementById('totalCheques'),
            readyCheques: document.getElementById('readyCheques'),
            processingCheques: document.getElementById('processingCheques'),
            totalAmount: document.getElementById('totalAmount'),
        };

        this.initializeEventListeners();
        this.fetchXMLData();
    }

    initializeEventListeners() {
        this.searchInput.addEventListener('input', () => this.searchAndFilterXML());
        document.getElementById('searchBtn').addEventListener('click', () => this.searchAndFilterXML());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetTable());
    }

    async fetchXMLData() {
        try {
           // const Fileresponse = await fetch('/data/sample.xml'); // Replace with your XML file path
            const response = await fetch('/accounts.office.cheque.inquiry-test/public/data/files.json');
            const xmlString = await response.text();
            this.parseXMLToTable(xmlString);
        } catch (error) {
            console.error('Error fetching XML:', error);
            this.showError('Failed to load data. Please try again.');
        }
    }

    parseXMLToTable(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
        const gPvnElements = xmlDoc.getElementsByTagName('G_PVN');

        this.tableBody.innerHTML = ''; // Clear existing rows

        Array.from(gPvnElements).forEach(element => {
            const row = this.createTableRow(element);
            this.tableBody.appendChild(row);
        });

        this.updateStats();
        this.tableContainer.style.display = 'block';
        this.emptyState.style.display = 'none';
    }

    createTableRow(element) {
        const row = document.createElement('tr');
        const fields = ['NARRATION', 'AMOUNT', 'CHEQ_NO', 'NAR', 'DD'];

        fields.forEach(field => {
            const cell = document.createElement('td');
            let value = element.getElementsByTagName(field)[0]?.textContent.trim() || '';
            if (field === 'AMOUNT') {
                value = `₨ ${parseFloat(value).toLocaleString()}`;
            }
            cell.textContent = value;
            row.appendChild(cell);
        });

        return row;
    }

    searchAndFilterXML() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const rows = this.tableBody.querySelectorAll('tr');
        let matchCount = 0;

        rows.forEach(row => {
            const cells = row.getElementsByTagName('td');
            const matchesSearch = Array.from(cells).some(cell => 
                cell.textContent.toLowerCase().includes(searchTerm)
            );
            row.style.display = matchesSearch ? '' : 'none';
            if (matchesSearch) matchCount++;
        });

        this.updateStats();
    }

    updateStats() {
        const rows = this.tableBody.querySelectorAll('tr');
        const visibleRows = Array.from(rows).filter(row => row.style.display !== 'none');

        const stats = {
            total: visibleRows.length,
            ready: visibleRows.filter(row => row.cells[4].textContent === 'Cheque Ready').length,
            processing: visibleRows.filter(row => row.cells[4].textContent === 'Processing').length,
            totalAmount: visibleRows.reduce((sum, row) => sum + parseFloat(row.cells[1].textContent.replace(/[^0-9.]/g, '')), 0),
        };

        this.stats.totalCheques.textContent = stats.total;
        this.stats.readyCheques.textContent = stats.ready;
        this.stats.processingCheques.textContent = stats.processing;
        this.stats.totalAmount.textContent = `₨ ${stats.totalAmount.toLocaleString()}`;
    }

    resetTable() {
        this.searchInput.value = '';
        this.tableBody.querySelectorAll('tr').forEach(row => row.style.display = '');
        this.updateStats();
    }

    showError(message) {
        alert(message);
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new XMLTableHandler();
});
