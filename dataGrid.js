export class DataGrid {
    #container;
    #config;
    #index;
    #size;
    #rows = [];
    #table;
    #sortState;

    constructor({ container, config, data = [], index = 0, size = 50 } = {}) {
        this.#container = container;
        this.#config = config;
        this.#index = index;
        this.#size = size;
        this.extractRows(data);
        this.#table = new Table(this.#config, this);
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

        let renderedData = [...this.#rows];

        if (this.#sortState !== null && this.#sortState !== undefined) {
            const sortColumn = this.#table.getColumn(
                this.#sortState.columnName,
            );
            renderedData.sort((a, b) => {
                let sign = this.#sortState.direction === "asc" ? 1 : -1;
                return sign * sortColumn.compareValues(a, b);
            });
        }

        const start = this.#index * this.#size;
        const end = (this.#index + 1) * this.#size;
        for (let i = start; i < end; ++i) {
            if (i >= renderedData.length) break;
            const r = renderedData[i];
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
            if (row.id === undefined) {
                throw new Error("Data rows have no id's.");
            }
            this.#rows.push(new DataRow(row));
        }
    }

    setSortState(sortState) {
        this.#sortState = sortState;
        this.render();
    }

    get sortState() {
        return this.#sortState;
    }
}

class Table {
    #grid;
    #name;
    #label;
    #readonly;
    #columns = [];

    constructor(config, grid) {
        this.#grid = grid;
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
                return new TextColumn(columnConfig, this.#grid);
            }
            case "date": {
                return new DateColumn(columnConfig, this.#grid);
            }
            case "decimal": {
                return new DecimalColumn(columnConfig, this.#grid);
            }
            case "integer": {
                return new IntegerColumn(columnConfig, this.#grid);
            }
            case "select": {
                return new SelectColumn(columnConfig, this.#grid);
            }
            case "multiSelect": {
                return new MultiSelectColumn(columnConfig, this.#grid);
            }
            case "boolean": {
                return new BooleanColumn(columnConfig, this.#grid);
            }
            default: {
                throw new Error("Wrong or missing column type");
            }
        }
    }

    get columns() {
        return this.#columns;
    }

    getColumn(columnName) {
        const column = this.#columns.find((c) => c.name === columnName);
        return column;
    }
}

class Column {
    #grid;
    #name;
    #label;
    #type;
    #readOnly;
    #searchable;
    #hidden;

    constructor(columnConfig, grid) {
        this.#grid = grid;
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

        const sort = document.createElement("button");
        sort.classList.add("sort-button");
        sort.type = "button";
        const sortState = this.#grid.sortState;
        if (
            sortState !== null &&
            sortState !== undefined &&
            sortState.columnName === this.#name
        ) {
            sort.classList.add(sortState.direction);
        }
        sort.innerHTML = `<svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><polygon points="12 18 20 6 4 6"></polygon></svg>`;
        sort.addEventListener("click", () => {
            let state = { ...this.#grid.sortState };
            if (state.columnName !== this.#name) {
                state = { columnName: this.#name, direction: "asc" };
            } else {
                if (state.direction === "asc") state.direction = "desc";
                else state = null;
            }
            this.#grid.setSortState(state);
        });
        th.append(sort);

        return th;
    }

    get cellClass() {
        return "data-cell";
    }

    renderCell(value) {
        if (this.#hidden) return null;
        const td = document.createElement("td");
        td.className = this.cellClass;
        return td;
    }

    compareValues(a, b) {
        return a.getField(this.name) - b.getField(this.name);
    }
}

class TextColumn extends Column {
    constructor(columnConfig, grid) {
        super(columnConfig, grid);
    }

    renderCell(value) {
        const td = super.renderCell(value);
        if (td === null) return null;
        td.append(String(value) || "");
        return td;
    }

    compareValues(a, b) {
        const as = a.getField(this.name);
        const bs = b.getField(this.name);
        return as.localeCompare(bs);
    }
}

class DateColumn extends Column {
    #default;

    constructor(columnConfig, grid) {
        super(columnConfig, grid);
        this.#default =
            columnConfig.default === undefined ? "today" : columnConfig.default;
    }

    getDefaultDate() {
        if (this.#default === "today") {
            return new Date();
        }
        return new Date(this.#default);
    }

    renderCell(value) {
        const td = super.renderCell(value);
        if (td === null) return null;
        td.append(String(value) || "");
        return td;
    }

    compareValues(a, b) {
        return (
            new Date(a.getField(this.name)) - new Date(b.getField(this.name))
        );
    }
}

class DecimalColumn extends Column {
    #places;
    #min;
    #max;

    constructor(columnConfig, grid) {
        super(columnConfig, grid);
        this.#places =
            columnConfig.places === undefined ? 2 : columnConfig.places;
        this.#min = columnConfig.min;
        this.#max = columnConfig.max;
    }

    get cellClass() {
        return "numeric-cell";
    }

    renderCell(value) {
        const td = super.renderCell(value);
        if (td === null) return null;
        td.append(value.toFixed(this.#places) || "");
        return td;
    }
}

class IntegerColumn extends DecimalColumn {
    constructor(columnConfig, grid) {
        super({ ...columnConfig, places: 0 }, grid);
    }
}

class SelectColumn extends Column {
    #optionType;
    #optionEditable;
    #optionList = [];

    constructor(columnConfig, grid) {
        super(columnConfig, grid);
        this.#optionType = columnConfig.optionType;
        this.#optionEditable = columnConfig.optionEditable !== false;
        this.#optionList = columnConfig.optionList;
    }

    renderCell(value) {
        const td = super.renderCell(value);
        if (td === null) return null;
        td.append(this.getOptionLabel(value));
        return td;
    }

    get optionType() {
        return this.#optionType;
    }

    get optionEditable() {
        return this.#optionEditable;
    }

    get optionList() {
        return this.#optionList;
    }

    getOptionLabel(value) {
        const option = this.getOption(value);
        if (option === undefined || option.optionLabel === undefined) return "";
        return option.optionLabel;
    }

    getOption(value) {
        return this.#optionList.find((o) => o.optionValue === value);
    }

    getOptionList(values) {
        if (!Array.isArray(values)) return [];
        const list = [];
        for (let v of values) {
            list.push(this.getOption(v));
        }
        return list;
    }

    compareValues(a, b) {
        const ao = this.getOption(a.getField(this.name));
        const bo = this.getOption(b.getField(this.name));
        return ao.optionIndex - bo.optionIndex;
    }
}

class MultiSelectColumn extends SelectColumn {
    constructor(columnConfig, grid) {
        super(columnConfig, grid);
    }

    renderCell(value) {
        const td = super.renderCell(value);
        if (td === null) return null;
        if (!Array.isArray(value)) return td;
        const options = this.getOptionList(value);
        options.sort((a, b) => a.optionIndex - b.optionIndex);
        td.append(
            options.reduce((s, o) => {
                let l = this.getOptionLabel(o.optionValue);
                if (s !== "" && l !== "") s += ", ";
                s += l;
                return s;
            }, ""),
        );
        return td;
    }

    compareValues(a, b) {
        const aol = this.getOptionList(a.getField(this.name));
        aol.sort((aa, bb) => aa.optionIndex - bb.optionIndex);

        const bol = this.getOptionList(b.getField(this.name));
        bol.sort((aa, bb) => aa.optionIndex - bb.optionIndex);

        if (aol.length !== bol.length) return aol.length - bol.length;

        for (let i = 0; i < aol.length; ++i) {
            if (aol[i].optionIndex === bol[i].optionIndex) continue;
            return aol[i].optionIndex - bol[i].optionIndex;
        }

        return 0;
    }
}

class BooleanColumn extends Column {
    constructor(columnConfig, grid) {
        super(columnConfig, grid);
    }

    renderCell(value) {
        const td = super.renderCell(value);
        if (td === null) return null;
        const toggle = document.createElement("span");
        toggle.className = "toggle";
        toggle.classList.toggle("on", value);
        const knob = document.createElement("span");
        knob.className = "toggle-knob";
        toggle.append(knob);
        td.append(toggle);
        return td;
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
        if (this.#fields[column] === undefined) {
            return "";
        }
        return this.#fields[column];
    }
}
