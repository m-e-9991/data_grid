export class DataGrid {
    #container;
    #config;
    #index;
    #size;
    #rows = [];
    #table;
    #sortState;
    #filterState = {};

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

        if (Object.keys(this.#filterState).length !== 0) {
            for (const columnName of Object.keys(this.#filterState)) {
                const column = this.#table.getColumn(columnName);
                renderedData = renderedData.filter((row) => column.filter(row));
            }
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

    get filterState() {
        return this.#filterState;
    }

    appendFilterConfig(columnName, filterConfig) {
        this.#filterState[columnName] = filterConfig;
        this.render();
    }

    removeFilterConfig(columnName) {
        delete this.#filterState[columnName];
        this.render();
    }

    getColumnFilterConfig(columnName) {
        if (this.#filterState[columnName] === undefined) return null;
        return this.#filterState[columnName];
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
    #filterElements;

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

    get grid() {
        return this.#grid;
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
        sort.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="10" height="10" fill="currentColor"><path d="M32 288c-12.9 0-24.6 7.8-29.6 19.8S.2 333.5 9.4 342.6l160 160c12.5 12.5 32.8 12.5 45.3 0l160-160c9.2-9.2 11.9-22.9 6.9-34.9S364.9 288 352 288L32 288z"/></svg>`;
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

        if (this.searchable) {
            const filter = document.createElement("button");
            filter.type = "button";
            filter.classList.add("filter-button");
            filter.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="10" height="10" fill="currentColor"><path d="M32 64C19.1 64 7.4 71.8 2.4 83.8S.2 109.5 9.4 118.6L192 301.3 192 416c0 8.5 3.4 16.6 9.4 22.6l64 64c9.2 9.2 22.9 11.9 34.9 6.9S320 492.9 320 480l0-178.7 182.6-182.6c9.2-9.2 11.9-22.9 6.9-34.9S492.9 64 480 64L32 64z"/></svg>`;
            if (this.grid.getColumnFilterConfig(this.name) !== null) {
                filter.classList.add("active");
            }
            filter.addEventListener("click", () => {
                const overlay = document.createElement("div");
                overlay.className = "overlay";

                const dialog = this.renderFilterDialog(overlay);

                overlay.addEventListener("click", () => {
                    overlay.remove();
                    dialog.remove();
                });

                const rect = filter.getBoundingClientRect();
                dialog.style.top = rect.bottom + 2 + "px";
                dialog.style.left = rect.left + rect.width + 2 + "px";

                document.body.append(overlay, dialog);

                dialog.show();
                const dialogRect = dialog.getBoundingClientRect();
                if (dialogRect.left + dialogRect.width > window.innerWidth) {
                    dialog.style.left = rect.left - dialogRect.width - 2 + "px";
                }
            });
            th.append(filter);
        }

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

    renderFilterDialog(overlay) {
        const filterConfig = this.#grid.getColumnFilterConfig(this.#name);

        const dialog = document.createElement("dialog");
        dialog.classList.add("filter-dialog");

        const control = this.renderFilterControl();
        dialog.append(control);

        const apply = document.createElement("button");
        apply.type = "button";
        apply.classList.add("apply-button");
        apply.append("Apply");
        apply.addEventListener("click", () => {
            overlay.remove();
            dialog.remove();
            this.#grid.appendFilterConfig(this.name, this.filterConfig);
        });
        if (filterConfig === null) apply.disabled = true;

        const discard = document.createElement("button");
        discard.type = "button";
        discard.classList.add("discard-button");
        discard.append("Discard");
        discard.addEventListener("click", () => {
            overlay.remove();
            dialog.remove();
        });

        const buttonsContainer = document.createElement("div");
        buttonsContainer.classList.add("buttons-container");
        buttonsContainer.append(apply, discard);

        if (filterConfig !== null) {
            const clear = document.createElement("button");
            clear.type = "button";
            clear.className = "clear-button";
            clear.append("Clear");
            clear.addEventListener("click", () => {
                overlay.remove();
                dialog.remove();
                this.#grid.removeFilterConfig(this.#name);
            });
            buttonsContainer.append(clear);
        }

        this.#filterElements.apply = apply;

        dialog.append(control, buttonsContainer);
        return dialog;
    }

    renderFilterControl() {
        const container = document.createElement("div");
        container.classList.add("control-container");
        return container;
    }

    get filterElements() {
        return this.#filterElements;
    }

    setFilterElements(object) {
        this.#filterElements = object;
    }

    get filterConfig() {
        let config = {};
        return config;
    }

    compareValues(a, b) {
        return a.getField(this.name) - b.getField(this.name);
    }

    filter(row) {
        return true;
    }

    get isValidFilter() {
        return true;
    }

    enableApplyButton() {
        if (this.isValidFilter) {
            this.#filterElements.apply.disabled = false;
        }
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

    renderFilterControl() {
        const container = super.renderFilterControl();

        const filterConfig = this.grid.getColumnFilterConfig(this.name);

        const select = document.createElement("select");

        select.innerHTML = `
<option value="equals">Equals</option>
<option value="contains">Contains</option>
<option value="starts">Starts with</option>
<option value="ends">Ends with</option>
`;
        if (filterConfig !== null && filterConfig.operator !== undefined) {
            select.value = filterConfig.operator;
        }

        const text = document.createElement("input");
        text.type = "text";
        if (filterConfig !== null && filterConfig.value !== undefined) {
            text.value = filterConfig.value;
        }
        text.addEventListener("input", () => this.enableApplyButton());

        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        label.append(checkbox, "Case-sensitive");
        if (filterConfig !== null && filterConfig.caseSensitive !== undefined) {
            checkbox.checked = filterConfig.caseSensitive;
        }

        container.append(select, text, label);
        this.setFilterElements({
            select,
            text,
            checkbox,
        });

        return container;
    }

    get filterConfig() {
        return {
            operator: this.filterElements.select.value,
            value: this.filterElements.text.value,
            caseSensitive: this.filterElements.checkbox.checked,
        };
    }

    get isValidFilter() {
        return this.filterConfig.value !== "";
    }

    filter(row) {
        const s = row.getField(this.name);
        const { operator, value, caseSensitive } =
            this.grid.getColumnFilterConfig(this.name);
        const a = caseSensitive ? s : s.toLowerCase();
        const b = caseSensitive ? value : value.toLowerCase();
        switch (operator) {
            case "equals": {
                return a === b;
            }
            case "contains": {
                return a.includes(b);
            }
            case "starts": {
                return a.startsWith(b);
            }
            case "ends": {
                return a.endsWith(b);
            }
            default: {
                return true;
            }
        }
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

    renderFilterControl() {
        const container = super.renderFilterControl();

        const filterConfig = this.grid.getColumnFilterConfig(this.name);

        //TODO

    }

    get filterConfig() {
        //TODO
    }

    get isValidFilter() {
        //TODO
    }

    filter() {
        //TODO
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
