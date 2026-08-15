export class DataGrid {
    #container;
    #config;
    #index;
    #size;
    #rows = [];
    #state;
    #table;

    constructor({ container, config, data = [], index = 0, size = 50 } = {}) {
        this.#container = container;
        this.#config = config;
        this.#index = index;
        this.#size = size;
        this.extractRows(data);
        this.#table = new Table(this.#config);
        this.render();
    }

    render() {
        this.#container.textContent = "";
        const table = document.createElement("table");
        const thead = document.createElement("thead");
        const tbody = document.createElement("tbody");

        for (let c of this.#table.columns) {
            const ch = c.renderHeader();
            if (ch === null) continue;
            thead.append(ch);
        }

        table.append(thead);

        for (
            let i = this.#index * this.#size;
            i < (this.#index + 1) * this.#size;
            ++i
        ) {
            if (i >= this.#rows.length) break;
            const r = this.#rows[i];
            const tr = document.createElement("tr");
            for (let c of this.#table.columns) {
                const td = c.renderCell(r.getField(c.name));
                if (td === null) continue;
                tr.append(td);
            }
            tbody.append(tr);
        }

        table.append(tbody);

        this.#container.append(table);
    }

    extractRows(data) {
        if (!Array.isArray(data)) {
            throw new TypeError("An error happended while parsing the data.");
        }

        for (let row of data) {
            if (row.id === null) {
                throw new Error("Data rows have no id's.");
            }
            this.#rows.push(new DataRow(row));
        }
    }
}

class Table {
    #name;
    #label;
    #readonly;
    #columns = [];

    constructor(config) {
        this.#name = config.tableName;
        this.#label = config.tableLabel;
        this.#readonly = config.readOnly || false;

        for (let i = 0; i < config.columns.length; ++i) {
            this.#columns.push(this.columnFactory(config.columns[i]));
        }
    }

    columnFactory(columnConfig) {
        switch (columnConfig.columnType) {
            case "text": {
                return new TextColumn(columnConfig);
            }
            case "date": {
                return new DateColumn(columnConfig);
            }
            case "decimal": {
                return new DecimalColumn(columnConfig);
            }
            case "integer": {
                return new IntegerColumn(columnConfig);
            }
            case "select": {
                return new SelectColumn(columnConfig);
            }
            case "multiSelect": {
                return new MultiSelectColumn(columnConfig);
            }
            case "boolean": {
                return new BooleanColumn(columnConfig);
            }
            default: {
                throw new Error("Wrong or missing column type");
            }
        }
    }

    get columns() {
        return this.#columns;
    }
}

class Column {
    #name;
    #label;
    #type;
    #readOnly;
    #searchable;
    #hidden;

    constructor(columnConfig) {
        this.#name = columnConfig.columnName;
        this.#label = columnConfig.columnLabel;
        this.#type = columnConfig.columnType;
        this.#readOnly = columnConfig.readOnly || false;
        this.#searchable = columnConfig.searchable !== false;
        this.#hidden = columnConfig.hidden || false;
    }

    get name() {
        return this.#name;
    }

    get label() {
        return this.#label;
    }

    get readOnly() {
        return this.#readOnly;
    }

    get searchable() {
        return this.#searchable;
    }

    get hidden() {
        return this.#hidden;
    }

    renderHeader() {
        if (this.#hidden) {
            return null;
        }
        const th = document.createElement("th");
        th.append(this.#label);
        return th;
    }

    renderCell(value) {
        if (this.#hidden) return null;
        const td = document.createElement("td");
        td.append(String(value));
        return td;
    }
}

class TextColumn extends Column {
    constructor(columnConfig) {
        super(columnConfig);
    }
}

class DateColumn extends Column {
    #default;

    constructor(columnConfig) {
        super(columnConfig);
        this.#default = columnConfig.default || "today";
    }

    getDefaultDate() {
        if (this.#default === "today") {
            return new Date();
        }
        return new Date(this.#default);
    }
}

class DecimalColumn extends Column {
    #places;
    #min;
    #max;

    constructor(columnConfig) {
        super(columnConfig);
        this.#places = columnConfig.places || 2;
        this.#min = columnConfig.min || null;
        this.#max = columnConfig.max || null;
    }
}

class IntegerColumn extends Column {
    #min;
    #max;

    constructor(columnConfig) {
        super(columnConfig);
        this.#min = columnConfig.min || null;
        this.#max = columnConfig.max || null;
    }
}

class SelectColumn extends Column {
    #optionType;
    #optionEditable;
    #optionList = [];

    constructor(columnConfig) {
        super(columnConfig);
        this.#optionType = columnConfig.optionType;
        this.#optionEditable = columnConfig.optionEditable !== false;
        this.#optionList = columnConfig.optionList;
    }
}

class MultiSelectColumn extends SelectColumn {
    constructor(columnConfig) {
        super(columnConfig);
    }
}

class BooleanColumn extends Column {
    constructor(columnConfig) {
        super(columnConfig);
    }
}

class DataRow {
    #id;
    #fields = {};

    constructor(row) {
        const { id, ...rest } = row;
        this.#id = id;
        this.#fields = rest;
    }

    get id() {
        return this.#id;
    }

    getField(column) {
        if (this.#fields[column] === null) {
            return "";
        }
        return this.#fields[column];
    }
}
