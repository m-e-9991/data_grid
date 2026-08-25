import { DataRow } from "./dataRow.js";
import {
    TextColumn,
    DateColumn,
    DecimalColumn,
    IntegerColumn,
    SelectColumn,
    MultiSelectColumn,
    BooleanColumn,
} from "./column/index.js";

export class DataGrid {
    #container;
    #config;
    #index;
    #size;
    #onSave;

    #name;
    #label;
    #readonly;
    #hardDelete;
    #columns = [];

    #rows = [];
    #processedRows = [];
    #renderedRows = [];

    #sortState = null;
    #filterState = {};
    #editState = false;

    #selectedRows = [];
    #addedRows = [];
    #dirtyRows = [];
    #removedRows = [];

    #editingCell = null;
    #editingCellInput = null;

    constructor({
        container,
        config,
        data = [],
        index = 0,
        size = 10,
        onSave = () => {},
    } = {}) {
        this.#container = container;
        this.#config = config;
        this.#index = index;
        this.#size = size;
        this.#onSave = onSave;

        this.#name = config.tableName;
        this.#label = config.tableLabel;
        this.#readonly = config.readOnly ?? false;
        this.#hardDelete = config.hardDelete ?? false;

        const columnConfigs = [...config.columns];
        if (!this.#hardDelete) {
            columnConfigs.push({
                columnName: "active",
                columnLabel: "Active",
                columnType: "boolean",
                hidden: true,
            });
        }
        columnConfigs.forEach((c) => {
            this.#columns.push(this.columnFactory(c));
        });

        this.extractRows(data);
        this.render();
    }

    columnFactory(columnConfig) {
        const { columnName } = columnConfig;

        const getSortDirection = () => {
            if (this.#sortState === null) return null;
            if (this.#sortState.columnName !== columnName) return null;
            return this.#sortState.direction;
        };

        const setSortDirection = (direction) => {
            const sortState =
                direction === null ? null : { columnName, direction };
            this.setSortState(sortState);
        };

        const getEditState = () => {
            return this.#editState;
        };

        const getDirtyValue = (rowId) => {
            return this.getDirtyValue(rowId, columnName);
        };

        const isEditingCell = (rowId) => {
            return (
                this.#editingCell !== null &&
                this.#editingCell.columnName === columnName &&
                this.#editingCell.rowId === rowId
            );
        };

        const setEditingCellInput = (input) => {
            this.#editingCellInput = input;
        };

        const commitUpdate = (rowId, oldVal, newVal) => {
            this.commitUpdate(rowId, columnName, oldVal, newVal);
        };

        const getFilterConfig = () => {
            return this.getColumnFilterConfig(columnName);
        };

        const setFilterConfig = (config) => {
            this.appendFilterConfig(columnName, config);
        };

        const removeFilterConfig = () => {
            this.removeFilterConfig(columnName);
        };

        const config = {
            columnConfig,
            getSortDirection,
            setSortDirection,
            getEditState,
            isEditingCell,
            setEditingCellInput,
            getFilterConfig,
            setFilterConfig,
            removeFilterConfig,
            getDirtyValue,
            commitUpdate,
        };

        switch (columnConfig.columnType) {
            case "text": {
                return new TextColumn(config);
            }
            case "date": {
                return new DateColumn(config);
            }
            case "decimal": {
                return new DecimalColumn(config);
            }
            case "integer": {
                return new IntegerColumn(config);
            }
            case "select": {
                return new SelectColumn(config);
            }
            case "multiSelect": {
                return new MultiSelectColumn(config);
            }
            case "boolean": {
                return new BooleanColumn(config);
            }
            default: {
                throw new Error("Wrong or missing column type");
            }
        }
    }

    getColumn(columnName) {
        const column = this.#columns.find((c) => c.name === columnName);
        return column;
    }

    render(keepScroll = false) {
        const oldScrollArea = this.#container.querySelector(".scroll-area");
        const scrollTop = oldScrollArea?.scrollTop ?? 0;
        const scrollLeft = oldScrollArea?.scrollLeft ?? 0;

        this.#container.textContent = "";

        const table = document.createElement("table");

        const toolbar = this.renderToolbar();

        this.#processedRows = [...this.#rows];

        this.appendAddedRows();

        this.sortRows();

        this.filterRows();

        table.append(this.renderHeaders(), this.renderRows());

        const scrollArea = document.createElement("div");
        scrollArea.className = "scroll-area";
        scrollArea.append(table);
        scrollArea.style.setProperty("--page-size", this.#size);

        const footer = this.renderFooter();

        this.#container.append(toolbar, scrollArea, footer);

        if (keepScroll) {
            scrollArea.scrollTop = scrollTop;
            scrollArea.scrollLeft = scrollLeft;
        }

        if (this.#editingCellInput !== null) {
            if (
                this.#editingCellInput instanceof HTMLInputElement &&
                (this.#editingCellInput.type === "text" ||
                    this.#editingCellInput.type === "number")
            ) {
                this.#editingCellInput.select();
            } else {
                this.#editingCellInput.focus();
            }
        }
    }

    renderToolbar() {
        const toolbar = document.createElement("div");
        toolbar.className = "grid-toolbar";

        if (Object.keys(this.#filterState).length !== 0) {
            const clearFilters = document.createElement("button");
            clearFilters.type = "button";
            clearFilters.append("Clear Filters");
            clearFilters.className = "clear-filters-btn";
            clearFilters.addEventListener("click", () => {
                this.clearFilterState();
            });
            toolbar.append(clearFilters);
        }

        if (!this.readOnly && !this.#editState) {
            const edit = document.createElement("button");
            edit.type = "button";
            edit.append("Edit");
            edit.className = "edit-btn";
            edit.addEventListener("click", () => {
                this.toggleEditMode(true);
            });
            toolbar.append(edit);
        }

        if (this.#editState && this.#selectedRows.length > 0) {
            const del = document.createElement("button");
            del.type = "button";
            del.className = "delete-btn";
            del.append(
                `${this.#hardDelete ? "Delete" : "Archive"} Selected (${this.#selectedRows.length})`,
            );
            del.addEventListener("click", () => {
                this.showModal(
                    `${this.#hardDelete ? "Delete" : "Archive"} (${this.#selectedRows.length}) selected rows?`,
                    this.#hardDelete ? "Delete" : "Archive",
                    () => {
                        this.commitRemoval();
                    },
                );
            });
            toolbar.append(del);
        }

        if (this.#editState) {
            const add = document.createElement("button");
            add.type = "button";
            add.className = "add-btn";
            add.append("Add");
            add.addEventListener("click", () => {
                const form = document.createElement("form");
                form.className = "add-row-form";

                const row = this.getNewRow();

                const inputs = this.#columns
                    .filter((c) => !c.hidden)
                    .map((c) => {
                        const label = document.createElement("label");
                        const input = c.renderInputField(row.getField(c.name));
                        label.append(c.label, input);
                        input.classList.toggle(
                            "wrong-input",
                            !c.isValidInput(c.getInputValue(input)),
                        );
                        input.addEventListener("input", () => {
                            input.classList.toggle(
                                "wrong-input",
                                !c.isValidInput(c.getInputValue(input)),
                            );
                        });
                        form.append(label);
                        return { column: c, input };
                    });

                this.showModal(
                    form,
                    "Submit",
                    () => {
                        inputs.forEach(({ column, input }) => {
                            row.setField(
                                column.name,
                                column.getInputValue(input),
                            );
                        });
                        this.commitAdd(row);
                    },
                    () => {
                        return inputs.every(({ column, input }) => {
                            return column.isValidInput(
                                column.getInputValue(input),
                            );
                        });
                    },
                );
            });
            toolbar.append(add);
        }

        const changesCount =
            this.#dirtyRows.length +
            this.#addedRows.length +
            this.#removedRows.length;

        if (this.#editState && changesCount > 0) {
            const save = document.createElement("button");
            save.type = "button";
            save.className = "save-btn";
            save.append(`Save (${changesCount})`);
            save.addEventListener("click", () => {
                this.showModal(
                    `Save (${changesCount}) changes?`,
                    "Save",
                    () => {
                        this.applyChanges();
                    },
                );
            });
            toolbar.append(save);
        }

        if (this.#editState) {
            const cancel = document.createElement("button");
            cancel.type = "button";
            cancel.className = "cancel-btn";
            cancel.append("Cancel");
            cancel.addEventListener("click", () => {
                if (changesCount === 0) {
                    this.clearEditState();
                    this.render();
                } else {
                    this.showModal(
                        `Discard (${changesCount}) changes?`,
                        "Discard",
                        () => {
                            this.clearEditState();
                            this.render();
                        },
                    );
                }
            });
            toolbar.append(cancel);
        }

        return toolbar;
    }

    renderHeaders() {
        const thead = document.createElement("thead");

        if (this.#editState) {
            const th = document.createElement("th");
            const check = document.createElement("input");
            check.type = "checkbox";
            check.checked =
                this.#processedRows.length !== 0 &&
                this.#processedRows.length === this.#selectedRows.length;
            check.addEventListener("input", () => {
                if (check.checked) {
                    this.#selectedRows = this.#processedRows;
                } else {
                    this.#selectedRows = [];
                }
                this.render(true);
            });
            th.append(check);
            thead.append(th);
        }
        for (let c of this.#columns) {
            const ch = c.renderHeader();
            if (ch === null) continue;
            thead.append(ch);
        }

        return thead;
    }

    appendAddedRows() {
        if (this.#editState && this.#addedRows.length !== 0) {
            this.#processedRows.push(...this.#addedRows);
        }
    }

    sortRows() {
        if (this.#sortState !== null) {
            const { columnName, direction } = this.#sortState;
            const sortColumn = this.getColumn(columnName);
            this.#processedRows.sort((a, b) => {
                const dirtyA = a.clone();
                const dirtyB = b.clone();

                const dirtyValueA = this.getDirtyValue(dirtyA.id, columnName);
                const dirtyValueB = this.getDirtyValue(dirtyB.id, columnName);
                if (dirtyValueA !== null) {
                    const { newVal } = dirtyValueA;
                    dirtyA.setField(columnName, newVal);
                }
                if (dirtyValueB !== null) {
                    const { newVal } = dirtyValueB;
                    dirtyB.setField(columnName, newVal);
                }
                const sign = direction === "asc" ? 1 : -1;
                return sign * sortColumn.sort(dirtyA, dirtyB);
            });
        }
    }

    filterRows() {
        if (!this.#hardDelete) {
            this.#processedRows = this.#processedRows.filter((row) =>
                row.getField("active"),
            );
        }
        if (this.#editState) {
            this.#processedRows = this.#processedRows.filter(
                (r) => !this.#removedRows.includes(r),
            );
        }
        Object.keys(this.#filterState).forEach((columnName) => {
            const column = this.getColumn(columnName);
            this.#processedRows = this.#processedRows.filter((row) => {
                const dirtyRow = row.clone();
                const dirtyValue = this.getDirtyValue(dirtyRow.id, columnName);
                if (dirtyValue !== null) {
                    const { newVal } = dirtyValue;
                    dirtyRow.setField(columnName, newVal);
                }
                return column.filter(dirtyRow);
            });
        });
    }

    renderRows() {
        const tbody = document.createElement("tbody");

        if (this.#processedRows.length === 0) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.colSpan = this.#columns.filter((c) => !c.hidden).length;
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

            const row = this.#processedRows[i];

            this.#renderedRows.push(row);

            const tr = document.createElement("tr");

            tr.classList.toggle(
                "added-row",
                this.#editState && this.#addedRows.includes(row),
            );

            if (this.#editState) {
                const td = document.createElement("td");

                td.isSelect = true;

                const check = document.createElement("input");
                check.type = "checkbox";
                check.checked = this.#selectedRows.includes(row);
                check.addEventListener("input", () => {
                    if (check.checked) {
                        this.#selectedRows.push(row);
                    } else {
                        this.#selectedRows = this.#selectedRows.filter(
                            (rr) => rr !== row,
                        );
                    }
                    this.render(true);
                });

                td.append(check);

                tr.append(td);
            }

            this.#columns
                .filter((c) => !c.hidden)
                .forEach((c) => {
                    tr.append(c.renderCell(row));
                });
            tbody.append(tr);
        }

        if (this.#editState) {
            tbody.addEventListener("click", (e) => {
                const td = e.target.closest("td");
                if (td === null) return;

                if (
                    this.#editingCell !== null &&
                    this.#editingCell.rowId === td.rowId &&
                    this.#editingCell.columnName === td.columnName
                ) {
                    return;
                }

                if (td.isSelect) {
                    return;
                }

                if (!this.getColumn(td.columnName).readOnly) {
                    this.#editingCell = {
                        rowId: td.rowId,
                        columnName: td.columnName,
                    };
                }

                this.render(true);
            });
        }

        return tbody;
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
        index.addEventListener("beforeinput", (e) => {
            if (e.data === ".") {
                e.preventDefault();
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
        size.addEventListener("beforeinput", (e) => {
            if (e.data === ".") {
                e.preventDefault();
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

    getDirtyValue(rowId, columnName) {
        const dirtyRow = this.#dirtyRows.find((d) => d.rowId === rowId);
        if (dirtyRow === undefined) {
            return null;
        }
        const value = dirtyRow.values.find((v) => v.columnName === columnName);
        if (value === undefined) {
            return null;
        }
        return value;
    }

    extractRows(data) {
        if (!Array.isArray(data)) {
            throw new TypeError("An error happended while parsing the data.");
        }

        for (let row of data) {
            if (row.id === undefined) {
                throw new Error("Data rows have no id's.");
            }
            this.#rows.push(new DataRow(row, this.#hardDelete));
        }
    }

    setSortState(sortState) {
        this.#sortState = sortState;
        this.render(true);
    }

    get editState() {
        return this.#editState;
    }

    get sortState() {
        return this.#sortState;
    }

    get editingCell() {
        return this.#editingCell;
    }

    appendFilterConfig(columnName, filterConfig) {
        this.clearCellEditingState();
        this.#selectedRows = [];
        this.#filterState[columnName] = filterConfig;
        this.#index = 0;
        this.render();
    }

    removeFilterConfig(columnName) {
        this.clearCellEditingState();
        this.#selectedRows = [];
        delete this.#filterState[columnName];
        this.#index = 0;
        this.render();
    }

    clearFilterState() {
        this.clearCellEditingState();
        this.#selectedRows = [];
        this.#filterState = {};
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

    toggleEditMode(state) {
        this.#editState = state;
        this.#index = 0;
        this.render();
    }

    showModal(content, label, handler, validate = () => true) {
        const modal = document.createElement("dialog");
        modal.className = "modal";

        const contentDiv = document.createElement("div");
        contentDiv.className = "content";
        contentDiv.append(content);

        const btnDiv = document.createElement("div");
        btnDiv.className = "buttons";

        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "cancel-btn";
        cancel.append("Cancel");
        cancel.addEventListener("click", () => {
            modal.close();
            modal.remove();
        });

        const confirm = document.createElement("button");
        confirm.type = "button";
        confirm.className = "confirm-btn";
        confirm.disabled = !validate();
        confirm.append(label);
        confirm.addEventListener("click", () => {
            modal.close();
            modal.remove();
            handler();
        });

        contentDiv.addEventListener("input", () => {
            confirm.disabled = !validate();
        });

        btnDiv.append(cancel, confirm);

        modal.append(contentDiv, btnDiv);

        document.body.append(modal);

        modal.showModal();
    }

    commitUpdate(rowId, columnName, oldVal, newVal) {
        const column = this.getColumn(columnName);

        const addedRow = this.#addedRows.find((r) => r.id === rowId);

        if (addedRow !== undefined) {
            addedRow.setField(columnName, newVal);
        } else {
            let dirtyRow = this.#dirtyRows.find((d) => d.rowId === rowId);

            if (dirtyRow === undefined) {
                dirtyRow = { rowId, values: [] };
                this.#dirtyRows.push(dirtyRow);
            }

            let value = dirtyRow.values.find(
                (v) => v.columnName === columnName,
            );

            if (value === undefined) {
                if (!column.compare(oldVal, newVal)) {
                    value = { columnName, oldVal, newVal };
                    dirtyRow.values.push(value);
                }
            } else {
                if (column.compare(value.oldVal, newVal)) {
                    dirtyRow.values = dirtyRow.values.filter(
                        (v) => v !== value,
                    );
                } else {
                    value.newVal = newVal;
                }
            }
            if (dirtyRow.values.length === 0) {
                this.#dirtyRows = this.#dirtyRows.filter((d) => d !== dirtyRow);
            }
        }

        this.clearCellEditingState();
        this.render(true);
    }

    commitRemoval() {
        const selectedAddedRows = this.#selectedRows.filter((r) =>
            this.#addedRows.includes(r),
        );

        this.#addedRows = this.#addedRows.filter(
            (r) => !selectedAddedRows.includes(r),
        );

        this.#selectedRows = this.#selectedRows.filter(
            (r) => !selectedAddedRows.includes(r),
        );

        this.#removedRows.push(...this.#selectedRows);

        this.#selectedRows.forEach((r) => {
            this.#dirtyRows = this.#dirtyRows.filter((d) => d.rowId !== r.id);
        });

        this.#selectedRows = [];
        this.render();
    }

    commitAdd(row) {
        this.#addedRows.push(row);
        this.render();
    }

    applyChanges() {
        const changes = [];

        changes.push(
            ...this.#dirtyRows.map((d) => ({ operation: "update", ...d })),
        );

        if (this.#hardDelete) {
            changes.push(
                ...this.#removedRows.map((r) => ({
                    operation: "delete",
                    rowId: r.id,
                })),
            );
        } else {
            changes.push(
                ...this.#removedRows.map((r) => ({
                    operation: "update",
                    rowId: r.id,
                    values: [
                        { columnName: "active", oldVal: true, newVal: false },
                    ],
                })),
            );
        }

        changes.push(
            ...this.#addedRows.map((r) => ({
                operation: "add",
                rowId: r.id,
                values: this.#columns.map((c) => ({
                    columnName: c.name,
                    value: r.getField(c.name),
                })),
            })),
        );

        this.#dirtyRows.forEach((d) => {
            const r = this.#rows.find((rr) => rr.id === d.rowId);
            d.values.forEach(({ columnName, newVal }) => {
                r.setField(columnName, newVal);
            });
        });

        if (this.#hardDelete) {
            this.#rows = this.#rows.filter(
                (r) => !this.#removedRows.includes(r),
            );
        } else {
            this.#removedRows.forEach((r) => {
                r.setField("active", false);
            });
        }

        this.#rows.push(...this.#addedRows);

        const changesCount = changes.length;

        if (changesCount !== 0) {
            this.#onSave(changes);
        }

        this.clearEditState();
        this.render();
    }

    clearCellEditingState() {
        this.#editingCell = null;
        this.#editingCellInput = null;
    }

    clearEditState() {
        this.#dirtyRows = [];
        this.#editState = false;
        this.#addedRows = [];
        this.#selectedRows = [];
        this.#removedRows = [];
        this.clearCellEditingState();
    }

    getNewRow() {
        const row = {};
        row.id = crypto.randomUUID();

        this.#columns.forEach((c) => {
            row[c.name] = c.defaultValue;
        });

        return new DataRow(row, this.#hardDelete);
    }
}
