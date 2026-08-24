export class Column {
    #name;
    #label;
    #type;
    #readOnly;
    #searchable;
    #hidden;
    #required;
    #filterElements;

    getSortDirection;
    setSortDirection;
    getEditState;
    isEditingCell;
    setEditingCellInput;
    getFilterConfig;
    setFilterConfig;
    removeFilterConfig;
    getDirtyValue;
    commitUpdate;

    constructor({
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
    }) {
        this.#name = columnConfig.columnName;
        this.#label = columnConfig.columnLabel;
        this.#type = columnConfig.columnType;
        this.#readOnly = columnConfig.readOnly ?? false;
        this.#searchable = columnConfig.searchable ?? true;
        this.#hidden = columnConfig.hidden ?? false;
        this.#required = columnConfig.required ?? false;

        this.setSortDirection = setSortDirection;
        this.getSortDirection = getSortDirection;
        this.getEditState = getEditState;
        this.isEditingCell = isEditingCell;
        this.setEditingCellInput = setEditingCellInput;
        this.getFilterConfig = getFilterConfig;
        this.setFilterConfig = setFilterConfig;
        this.removeFilterConfig = removeFilterConfig;
        this.getDirtyValue = getDirtyValue;
        this.commitUpdate = commitUpdate;
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

    get required() {
        return this.#required;
    }

    get readOnly() {
        return this.#readOnly;
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
        const direction = this.getSortDirection();
        if (direction !== null) {
            sort.classList.add(direction);
        }
        sort.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="10" height="10" fill="currentColor"><path d="M32 288c-12.9 0-24.6 7.8-29.6 19.8S.2 333.5 9.4 342.6l160 160c12.5 12.5 32.8 12.5 45.3 0l160-160c9.2-9.2 11.9-22.9 6.9-34.9S364.9 288 352 288L32 288z"/></svg>`;
        sort.addEventListener("click", () => {
            if (direction === null) {
                this.setSortDirection("asc");
            } else if (direction === "asc") {
                this.setSortDirection("desc");
            } else {
                this.setSortDirection(null);
            }
        });
        th.append(sort);

        if (this.searchable) {
            const filter = document.createElement("button");
            filter.type = "button";
            filter.classList.add("filter-button");
            filter.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="10" height="10" fill="currentColor"><path d="M32 64C19.1 64 7.4 71.8 2.4 83.8S.2 109.5 9.4 118.6L192 301.3 192 416c0 8.5 3.4 16.6 9.4 22.6l64 64c9.2 9.2 22.9 11.9 34.9 6.9S320 492.9 320 480l0-178.7 182.6-182.6c9.2-9.2 11.9-22.9 6.9-34.9S492.9 64 480 64L32 64z"/></svg>`;
            if (this.getFilterConfig() !== null) {
                filter.classList.add("active");
            }
            filter.addEventListener("click", () => {
                const overlay = document.createElement("div");
                overlay.className = "filter-overlay";

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

    get defaultValue() {
        return "";
    }

    renderCell(row) {
        if (this.#hidden) return null;

        const td = document.createElement("td");

        td.rowId = row.id;
        td.columnName = this.name;

        td.className = this.cellClass;

        let cellValue = row.getField(this.name);

        if (this.getEditState()) {
            const dirtyValue = this.getDirtyValue(row.id);
            if (dirtyValue !== null) {
                cellValue = dirtyValue.newVal;
                td.classList.add("dirty-cell");
            }
            if (this.isEditingCell(row.id)) {
                td.classList.add("editing-cell");
                const input = this.renderInputField(cellValue);

                this.setEditingCellInput(input);

                if (input !== undefined) {
                    const tryCommit = () => {
                        const value = this.getInputValue(input);
                        if (this.isValidInput(value)) {
                            this.commitUpdate(
                                row.id,
                                row.getField(this.name),
                                value,
                            );
                        }
                    };

                    input.addEventListener("blur", (e) => {
                        if (this.isPartOfInputField(input, e.relatedTarget)) {
                            return;
                        }
                        tryCommit();
                    });

                    input.addEventListener("keydown", (e) => {
                        if (e.key === "Enter") tryCommit();
                    });

                    td.classList.toggle(
                        "wrong-input",
                        !this.isValidInput(this.getInputValue(input)),
                    );

                    input.addEventListener("input", () => {
                        td.classList.toggle(
                            "wrong-input",
                            !this.isValidInput(this.getInputValue(input)),
                        );
                    });
                }

                td.append(input);
            } else {
                td.classList.toggle("edit-mode-cell", !this.#readOnly);
                td.append(this.renderData(cellValue));
            }
        } else {
            td.append(this.renderData(cellValue));
        }

        return td;
    }

    renderData(value) {
        return value;
    }

    renderInputField(value) {
        const input = document.createElement("input");
        input.type = "text";
        input.value = input;
        return input;
    }

    isPartOfInputField(input, element) {
        return input.contains(element);
    }

    isValidInput(value) {
        return !this.#required || !this.isEmpty(value);
    }

    isEmpty(value) {
        return value === "";
    }

    parseValue(value) {
        return value;
    }

    getInputValue(input) {
        return this.parseValue(input.value);
    }

    compare(a, b) {
        return a === b;
    }

    renderFilterDialog(overlay) {
        const filterConfig = this.getFilterConfig();

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
            this.setFilterConfig(this.filterConfig);
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
                this.removeFilterConfig();
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

    sort(a, b) {
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
