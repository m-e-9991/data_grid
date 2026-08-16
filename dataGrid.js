export class DataGrid {
    #container;
    #config;
    #index;
    #size;
    #rows = [];
    #processedRows = [];
    #renderedRows = [];
    #table;
    #sortState;
    #filterState = {};

    constructor({ container, config, data = [], index = 0, size = 10 } = {}) {
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

        this.renderHeaders(thead);

        table.append(thead);

        this.#processedRows = [...this.#rows];

        this.sortRows();

        this.filterRows();

        this.renderRows(tbody);

        table.append(tbody);

        const scrollArea = document.createElement("div");
        scrollArea.className = "scroll-area";
        scrollArea.append(table);
        scrollArea.style.setProperty("--page-size", this.#size);

        const footer = this.renderFooter();

        this.#container.append(scrollArea, footer);
    }

    renderHeaders(thead) {
        for (let c of this.#table.columns) {
            const ch = c.renderHeader();
            if (ch === null) continue;
            thead.append(ch);
        }
    }

    sortRows() {
        if (this.#sortState !== null && this.#sortState !== undefined) {
            const sortColumn = this.#table.getColumn(
                this.#sortState.columnName,
            );
            this.#processedRows.sort((a, b) => {
                let sign = this.#sortState.direction === "asc" ? 1 : -1;
                return sign * sortColumn.compareValues(a, b);
            });
        }
    }

    filterRows() {
        if (Object.keys(this.#filterState).length !== 0) {
            for (const columnName of Object.keys(this.#filterState)) {
                const column = this.#table.getColumn(columnName);
                this.#processedRows = this.#processedRows.filter((row) =>
                    column.filter(row),
                );
            }
        }
    }

    renderRows(tbody) {
        if (this.#processedRows.length === 0) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.colSpan = this.#table.columns.filter((c) => !c.hidden).length;
            const message = document.createElement("div");
            message.className = "empty-state";
            message.textContent = "No matching results";
            td.append(message);
            tr.append(td);
            tbody.append(tr);
            return;
        }
        const start = this.#index * this.#size;
        const end = (this.#index + 1) * this.#size;
        this.#renderedRows = [];
        for (let i = start; i < end; ++i) {
            if (i >= this.#processedRows.length) break;
            const r = this.#processedRows[i];
            this.#renderedRows.push(r);
            const tr = document.createElement("tr");
            for (let c of this.#table.columns) {
                const td = c.renderCell(r.getField(c.name));
                if (td === null) continue;
                tr.append(td);
            }
            tbody.append(tr);
        }
    }

    renderFooter() {
        const footer = document.createElement("div");
        footer.className = "grid-footer";

        const totalLength = this.#processedRows.length;
        const renderedLength = this.#renderedRows.length;

        const pagesCount = Math.ceil(totalLength / this.#size);

        const first = document.createElement("button");
        first.type = "button";
        first.append("<<");
        if (this.#index === 0 || pagesCount === 0) {
            first.disabled = true;
        }
        first.addEventListener("click", () => {
            this.setIndex(0);
        });

        const prev = document.createElement("button");
        prev.type = "button";
        prev.append("<");
        if (this.#index === 0 || pagesCount === 0) {
            prev.disabled = true;
        }
        prev.addEventListener("click", () => {
            this.setIndex(this.#index - 1);
        });

        const index = document.createElement("input");
        index.type = "number";
        index.value = this.#index + 1;
        index.min = 1;
        index.max = pagesCount;
        index.addEventListener("blur", () => {
            index.value = this.#index + 1;
        });
        index.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                let val = Number(index.value) - 1;
                if (val >= pagesCount) val = pagesCount - 1;
                this.setIndex(val);
            }
        });
        if (pagesCount === 0) {
            index.value = 0;
            index.disabled = true;
        }

        const totalPages = document.createElement("span");
        totalPages.textContent = pagesCount;

        const nxt = document.createElement("button");
        nxt.type = "button";
        nxt.append(">");
        if (this.#index === pagesCount - 1 || pagesCount === 0) {
            nxt.disabled = true;
        }
        nxt.addEventListener("click", () => {
            this.setIndex(this.#index + 1);
        });

        const last = document.createElement("button");
        last.type = "button";
        last.append(">>");
        if (this.#index === pagesCount - 1 || pagesCount === 0) {
            last.disabled = true;
        }
        last.addEventListener("click", () => {
            this.setIndex(pagesCount - 1);
        });

        const size = document.createElement("input");
        size.type = "number";
        size.value =
            this.#size === renderedLength ? this.#size : renderedLength;
        size.min = 10;
        size.max = totalLength;
        size.addEventListener("blur", () => {
            size.value = this.#size;
        });
        size.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                let val = Number(size.value);
                if (val > totalLength) val = totalLength;
                this.setPageSize(val);
            }
        });
        if (totalLength === 0) {
            size.value = 0;
            size.disabled = true;
        }

        footer.append(
            first,
            prev,
            index,
            " of ",
            totalPages,
            nxt,
            last,
            " showing ",
            size,
            " of ",
            totalLength,
        );
        return footer;
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
        this.#index = 0;
        this.render();
    }

    removeFilterConfig(columnName) {
        delete this.#filterState[columnName];
        this.#index = 0;
        this.render();
    }

    getColumnFilterConfig(columnName) {
        if (this.#filterState[columnName] === undefined) return null;
        return this.#filterState[columnName];
    }

    setIndex(index) {
        this.#index = index;
        this.render();
    }

    setPageSize(size) {
        this.#size = size;
        this.#index = 0;
        this.render();
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
        this.enableApplyButton(apply);
        for (const element of Object.values(this.#filterElements)) {
            if (Array.isArray(element)) {
                element.forEach((el) => {
                    if (
                        el instanceof HTMLInputElement ||
                        element instanceof HTMLSelectElement
                    ) {
                        el.addEventListener("input", () =>
                            this.enableApplyButton(apply),
                        );
                    }
                });
            } else if (
                element instanceof HTMLInputElement ||
                element instanceof HTMLSelectElement
            ) {
                element.addEventListener("input", () =>
                    this.enableApplyButton(apply),
                );
            }
        }

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

    enableApplyButton(apply) {
        apply.disabled = !this.isValidFilter;
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
        <option value="empty">Empty</option>
        <option value="not-empty">Not empty</option>
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
        text.hidden = true;
        if (filterConfig !== null && filterConfig.value !== undefined) {
            text.value = filterConfig.value;
            text.hidden =
                filterConfig.operator === "empty" ||
                filterConfig.operator === "not-empty";
        }

        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        label.append(checkbox, "Case-sensitive");
        label.hidden = true;
        if (filterConfig !== null && filterConfig.caseSensitive !== undefined) {
            checkbox.checked = filterConfig.caseSensitive;
            label.hidden =
                filterConfig.operator === "empty" ||
                filterConfig.operator === "not-empty";
        }
        select.addEventListener("input", () => {
            const val = select.value;
            if (val === "empty" || val === "not-empty") {
                text.hidden = true;
                label.hidden = true;
            } else {
                text.hidden = false;
                label.hidden = false;
                text.value = "";
                label.checked = false;
            }
        });

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
        const { operator, value } = this.filterConfig;
        if (operator === "empty" || operator === "not-empty") {
            return true;
        } else {
            return value !== "";
        }
    }

    filter(row) {
        const s = row.getField(this.name);
        const { operator, value, caseSensitive } =
            this.grid.getColumnFilterConfig(this.name);
        const a = caseSensitive ? s : s.toLowerCase();
        const b = caseSensitive ? value : value.toLowerCase();
        switch (operator) {
            case "empty": {
                return s === "";
            }
            case "not-empty": {
                return s !== "";
            }
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

        const select = document.createElement("select");
        select.innerHTML = `
        <option value="empty">Empty</option>
        <option value="not-empty">Not empty</option>
        <option value="is">Date is</option>
        <option value="between">Date between</option>
        <option value="after">Date after</option>
        <option value="before">Date before</option>
        `;
        if (filterConfig !== null) {
            select.value = filterConfig.operator;
        }

        const label1 = document.createElement("label");
        const span1 = document.createElement("span");
        const date1 = document.createElement("input");
        date1.type = "date";
        span1.textContent = "Date";
        label1.hidden = true;
        if (filterConfig !== null) {
            date1.value = filterConfig.value;
            span1.textContent =
                filterConfig.operator === "between" ? "Start" : "Date";
            label1.hidden =
                filterConfig.operator === "empty" ||
                filterConfig.operator === "not-empty";
        }
        label1.append(span1, date1);

        const label2 = document.createElement("label");
        const span2 = document.createElement("span");
        const date2 = document.createElement("input");
        date2.type = "date";
        span2.textContent = "End";
        label2.hidden = true;
        if (filterConfig !== null) {
            label2.hidden = filterConfig.operator !== "between";
            date2.value = filterConfig.endValue;
        }
        label2.append(span2, date2);

        select.addEventListener("input", () => {
            if (select.value === "empty" || select.value === "not-empty") {
                label1.hidden = true;
                label2.hidden = true;
            } else if (select.value === "between") {
                label1.hidden = false;
                span1.textContent = "Start";
                label2.hidden = false;
            } else {
                span1.textContent = "Date";
                label1.hidden = false;
                label2.hidden = true;
            }
        });

        container.append(select, label1, label2);
        this.setFilterElements({ select, date1, date2 });
        return container;
    }

    get filterConfig() {
        return {
            operator: this.filterElements.select.value,
            value: this.filterElements.date1.value,
            endValue: this.filterElements.date2.value,
        };
    }

    get isValidFilter() {
        const { operator, value, endValue } = this.filterConfig;
        if (operator === "between") {
            return (
                value !== "" &&
                endValue !== "" &&
                new Date(value) < new Date(endValue)
            );
        } else if (operator === "empty" || operator === "not-empty") {
            return true;
        } else {
            return value !== "";
        }
    }

    filter(row) {
        const d = new Date(row.getField(this.name));
        const { operator, value, endValue } = this.grid.getColumnFilterConfig(
            this.name,
        );

        const v = new Date(value);
        const e = endValue === "" ? null : new Date(endValue);

        switch (operator) {
            case "empty": {
                return Number.isNaN(d.getTime());
            }
            case "not-empty": {
                return !Number.isNaN(d.getTime());
            }
            case "is": {
                return d.getTime() === v.getTime();
            }
            case "between": {
                return d >= v && d <= e;
            }
            case "after": {
                return d > v;
            }
            case "before": {
                return d < v;
            }
            default: {
                return true;
            }
        }
    }
}

class DecimalColumn extends Column {
    #places;
    #min;
    #max;

    constructor(columnConfig, grid) {
        super(columnConfig, grid);
        this.#places = columnConfig.places ?? 2;
        this.#min = columnConfig.min ?? null;
        this.#max = columnConfig.max ?? null;
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

    renderFilterControl() {
        const container = super.renderFilterControl();

        const filterConfig = this.grid.getColumnFilterConfig(this.name);

        const select = document.createElement("select");
        select.innerHTML = `
        <option value="e">Equals</option>
        <option value="b">Between</option>
        <option value="g">Greater than</option>
        <option value="l">Less than</option>
        <option value="ge">Greater than or Equals</option>
        <option value="le">Less than or Equals</option>
        `;
        if (filterConfig !== null) {
            select.value = filterConfig.operator;
        }

        const label1 = document.createElement("label");
        const span1 = document.createElement("span");
        const num1 = document.createElement("input");
        num1.type = "number";
        num1.step = Math.pow(10, -this.#places);
        if (this.#min !== null) {
            num1.min = this.#min;
        }
        if (this.#max !== null) {
            num1.max = this.#max;
        }
        if (this.#places === 0) {
            num1.addEventListener("beforeinput", (event) => {
                if (event.data === ".") {
                    event.preventDefault();
                }
            });
        } else {
            num1.addEventListener("input", () => {
                const input = num1;
                if (input.value.includes(".")) {
                    const [intPart, decPart] = input.value.split(".");
                    if (decPart.length > this.#places) {
                        input.value =
                            intPart + "." + decPart.slice(0, this.#places);
                    }
                }
            });
        }

        span1.textContent = "Value";
        if (filterConfig !== null) {
            if (filterConfig.operator === "b") {
                span1.textContent = "Min";
            }
            num1.value = filterConfig.value;
        }
        label1.append(span1, num1);

        const label2 = document.createElement("label");
        const span2 = document.createElement("span");
        const num2 = document.createElement("input");
        num2.type = "number";
        num2.step = Math.pow(10, -this.#places);
        if (this.#min !== null) {
            num2.min = this.#min;
        }
        if (this.#max !== null) {
            num2.max = this.#max;
        }
        if (this.#places === 0) {
            num2.addEventListener("beforeinput", (event) => {
                if (event.data === ".") {
                    event.preventDefault();
                }
            });
        } else {
            num2.addEventListener("input", () => {
                const input = num2;
                if (input.value.includes(".")) {
                    const [intPart, decPart] = input.value.split(".");
                    if (decPart.length > this.#places) {
                        input.value =
                            intPart + "." + decPart.slice(0, this.#places);
                    }
                }
            });
        }

        span2.textContent = "Max";
        label2.append(span2, num2);
        label2.hidden = true;
        if (filterConfig !== null) {
            if (filterConfig.operator === "b") {
                label2.hidden = false;
                num2.value = filterConfig.maxValue;
            }
        }

        select.addEventListener("input", () => {
            if (select.value === "b") {
                span1.textContent = "Min";
                label2.hidden = false;
            } else {
                span1.textContent = "Value";
                label2.hidden = true;
            }
        });

        this.setFilterElements({ select, num1, num2 });

        container.append(select, label1, label2);

        return container;
    }

    get filterConfig() {
        return {
            operator: this.filterElements.select.value,
            value: this.filterElements.num1.value,
            maxValue: this.filterElements.num2.value,
        };
    }

    get isValidFilter() {
        const { operator, value, maxValue } = this.filterConfig;
        if (operator === "b") {
            return (
                value !== "" &&
                Number(value) >= this.#min &&
                Number(value) <= this.#max &&
                maxValue !== "" &&
                Number(maxValue) >= this.#min &&
                Number(maxValue) <= this.#max &&
                Number(value) < Number(maxValue)
            );
        } else {
            return (
                value !== "" &&
                Number(value) >= this.#min &&
                Number(value) <= this.#max
            );
        }
    }

    filter(row) {
        const n = row.getField(this.name);
        const { operator, value, maxValue } = this.grid.getColumnFilterConfig(
            this.name,
        );
        const v = Number(value);
        const mv = maxValue === "" ? null : Number(maxValue);

        switch (operator) {
            case "e": {
                return n === v;
            }
            case "b": {
                return n >= v && n <= mv;
            }
            case "g": {
                return n > v;
            }
            case "l": {
                return n < v;
            }
            case "ge": {
                return n >= v;
            }
            case "le": {
                return n <= v;
            }
            default: {
                return true;
            }
        }
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

    renderFilterControl() {
        const container = super.renderFilterControl();

        const filterConfig = this.grid.getColumnFilterConfig(this.name);

        const select = document.createElement("select");
        select.innerHTML = `
        <option value="empty">Empty</option>
        <option value="not-empty">Not empty</option>
        <option value="is">Is</option>
        <option value="not">Is not</option>
        <option value="in-list">In list</option>
        <option value="not-in-list">Not in list</option>
        `;
        if (filterConfig !== null) {
            select.value = filterConfig.operator;
        }

        const optionsContainer = document.createElement("div");
        optionsContainer.className = "options-container";
        optionsContainer.hidden = true;
        if (filterConfig !== null && filterConfig.operator !== "empty") {
            optionsContainer.hidden = false;
        }

        const options = [...this.optionList];
        options.sort((a, b) => a.optionIndex - b.optionIndex);

        const radiosContainer = document.createElement("div");
        radiosContainer.hidden = true;
        if (
            filterConfig !== null &&
            ["is", "not"].includes(filterConfig.operator)
        ) {
            radiosContainer.hidden = false;
        }
        const radios = [];
        options.forEach((opt) => {
            const label = document.createElement("label");
            const radio = document.createElement("input");
            radio.type = "radio";
            radio.name = this.name;
            radio.value = opt.optionValue;
            label.append(radio, opt.optionLabel);
            radios.push(radio);
            radiosContainer.append(label);
            if (
                filterConfig !== null &&
                filterConfig.value === opt.optionValue
            ) {
                radio.checked = true;
            }
        });

        const checkboxesContainer = document.createElement("div");
        checkboxesContainer.hidden = true;
        if (
            filterConfig !== null &&
            ["in-list", "not-in-list"].includes(filterConfig.operator)
        ) {
            checkboxesContainer.hidden = false;
        }
        const checkboxes = [];
        options.forEach((opt) => {
            const label = document.createElement("label");
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.value = opt.optionValue;
            label.append(checkbox, opt.optionLabel);
            checkboxes.push(checkbox);
            checkboxesContainer.append(label);
            if (
                filterConfig !== null &&
                filterConfig.values.includes(opt.optionValue)
            ) {
                checkbox.checked = true;
            }
        });

        optionsContainer.append(radiosContainer, checkboxesContainer);

        select.addEventListener("input", () => {
            if (select.value === "empty" || select.value === "not-empty") {
                optionsContainer.hidden = true;
                radiosContainer.hidden = true;
                checkboxesContainer.hidden = true;
            } else if (select.value === "is" || select.value === "not") {
                optionsContainer.hidden = false;
                radiosContainer.hidden = false;
                checkboxesContainer.hidden = true;
                radios.forEach((r) => {
                    r.checked = false;
                });
            } else if (
                select.value === "in-list" ||
                select.value === "not-in-list"
            ) {
                optionsContainer.hidden = false;
                checkboxesContainer.hidden = false;
                radiosContainer.hidden = true;
                checkboxes.forEach((c) => {
                    c.checked = false;
                });
            }
        });

        container.append(select, optionsContainer);
        this.setFilterElements({
            select,
            radios,
            checkboxes,
            optionsContainer,
            radiosContainer,
            checkboxesContainer,
        });
        return container;
    }

    get filterConfig() {
        return {
            operator: this.filterElements.select.value,
            value:
                this.filterElements.radios.find((r) => r.checked)?.value ?? "",
            values: this.filterElements.checkboxes
                .filter((c) => c.checked)
                .map((c) => c.value),
        };
    }

    get isValidFilter() {
        const { operator, value, values } = this.filterConfig;

        if (operator === "empty" || operator === "not-empty") {
            return true;
        } else if (operator === "is" || operator === "not") {
            return value !== "";
        } else if (operator === "in-list" || operator === "not-in-list") {
            return values.length > 0;
        } else {
            return false;
        }
    }

    filter(row) {
        const v = row.getField(this.name);
        const { operator, value, values } = this.grid.getColumnFilterConfig(
            this.name,
        );

        switch (operator) {
            case "empty": {
                return v === "";
            }
            case "not-empty": {
                return v !== "";
            }
            case "is": {
                return v === value;
            }
            case "not": {
                return v !== value;
            }
            case "in-list": {
                return values.includes(v);
            }
            case "not-in-list": {
                return !values.includes(v);
            }
            default: {
                return true;
            }
        }
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

    renderFilterControl() {
        const container = super.renderFilterControl();

        const {
            select,
            radios,
            checkboxes,
            optionsContainer,
            radiosContainer,
            checkboxesContainer,
        } = this.filterElements;

        const filterConfig = this.grid.getColumnFilterConfig(this.name);

        const newSelect = select.cloneNode(true);

        select.replaceWith(newSelect);

        newSelect.innerHTML = `
        <option value="empty">Empty</option>
        <option value="not-empty">Not empty</option>
        <option value="any-of">Has any of</option>
        <option value="none-of">Has none of</option>
        <option value="all-of">Has all of</option>
        <option value="exactly">Is exactly</option>
        `;
        if (filterConfig !== null) {
            newSelect.value = filterConfig.operator;
        }

        radiosContainer.remove();

        newSelect.addEventListener("input", () => {
            const val = newSelect.value;
            if (val === "empty" || val === "not-empty") {
                optionsContainer.hidden = true;
                checkboxesContainer.hidden = true;
            } else {
                optionsContainer.hidden = false;
                checkboxesContainer.hidden = false;
                checkboxes.forEach((c) => {
                    c.checked = false;
                });
            }
        });

        this.setFilterElements({ select: newSelect, checkboxes });
        return container;
    }

    get filterConfig() {
        return {
            operator: this.filterElements.select.value,
            values: this.filterElements.checkboxes
                .filter((c) => c.checked)
                .map((c) => c.value),
        };
    }

    get isValidFilter() {
        const { operator, values } = this.filterConfig;
        if (operator === "empty" || operator === "not-empty") {
            return true;
        } else {
            return values.length > 0;
        }
    }

    filter(row) {
        const l = row.getField(this.name);

        const { operator, values } = this.grid.getColumnFilterConfig(this.name);

        switch (operator) {
            case "empty": {
                return l.length === 0;
            }
            case "not-empty": {
                return l.length !== 0;
            }
            case "any-of": {
                return l.some((o) => values.includes(o));
            }
            case "none-of": {
                return l.every((o) => !values.includes(o));
            }
            case "all-of": {
                return values.every((o) => l.includes(o));
            }
            case "exactly": {
                return (
                    l.length === values.length &&
                    l.every((o) => values.includes(o))
                );
            }
            default: {
                return true;
            }
        }
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

    renderFilterControl() {
        const container = super.renderFilterControl();

        const filterConfig = this.grid.getColumnFilterConfig(this.name);

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "toggle-checkbox";
        if (filterConfig !== null) {
            checkbox.checked = filterConfig.value;
        }

        container.append(checkbox);
        this.setFilterElements({ checkbox });
        return container;
    }

    get filterConfig() {
        return { value: this.filterElements.checkbox.checked };
    }

    filter(row) {
        const v = row.getField(this.name);

        const { value } = this.grid.getColumnFilterConfig(this.name);

        return v === value;
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
