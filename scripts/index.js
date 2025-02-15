class XMLTableHandler {
    constructor() {
        this.tableBody = document.getElementById('checksTable');
        this.searchInput = document.getElementById('search');
        this.narCategory = document.getElementById('narCategory');
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

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.searchInput.addEventListener('input', () => this.filterTable());
        this.narCategory.addEventListener('change', () => this.filterTable());
    }

    parseXMLToTable(xmlString) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "text/xml");
            const gPvnElements = xmlDoc.getElementsByTagName('G_PVN');

            this.tableBody.innerHTML = '';
            Array.from(gPvnElements).forEach((element) => {
                const row = this.createTableRow(element);
                this.tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error parsing XML:', error);
        }
    }

    createTableRow(element) {
        const row = document.createElement('tr');
        let narValue = element.getElementsByTagName('NAR')[0]?.textContent?.trim() || '';
        row.setAttribute("data-nar", narValue.toLowerCase());

        Object.keys(this.columns).forEach(field => {
            const cell = document.createElement('td');
            let value = element.getElementsByTagName(field)[0]?.textContent?.trim() || '';

            if (field === 'AMOUNT') {
                value = parseFloat(value).toLocaleString('en-US');
            }

            cell.textContent = value;
            row.appendChild(cell);
        });

        return row;
    }

    filterTable() {
        let category = this.narCategory.value.toLowerCase();
        let searchQuery = this.searchInput.value.toLowerCase();
        let rows = this.tableBody.querySelectorAll('tr');

        rows.forEach(row => {
            let rowNAR = row.getAttribute("data-nar");
            let matchesCategory = category === "" || rowNAR.includes(category);
            let matchesSearch = searchQuery === "" || rowNAR.includes(searchQuery);
            row.style.display = matchesCategory && matchesSearch ? "" : "none";
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const handler = new XMLTableHandler();
    handler.fetchXMLData();
});
