import { Column } from "./column.js";

export class SelectColumn extends Column {
    #optionType;
    #optionEditable;
    #optionList = [];

    constructor(config) {
        super(config);
        this.#optionType = config.columnConfig.optionType;
        this.#optionEditable = config.columnConfig.optionEditable !== false;
        this.#optionList = config.columnConfig.optionList;
    }

    renderData(value) {
        return this.getOptionLabel(this.getOption(value));
    }

    renderInputField(value) {
        const select = document.createElement("select");

        select.innerHTML = `<option value=""></option>`;

        const optionList = [...this.optionList];

        select.append(
            ...optionList
                .sort((a, b) => a.optionIndex - b.optionIndex)
                .map((o) => {
                    const option = document.createElement("option");
                    option.value = o.optionValue;
                    option.textContent = this.getOptionLabel(o);
                    return option;
                }),
        );

        select.value = value;

        return select;
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

    getOptionLabel(option) {
        if (option === null) return "";
        return option.optionLabel;
    }

    getOption(value) {
        return this.#optionList.find((o) => o.optionValue === value) ?? null;
    }

    getOptionList(values) {
        if (!Array.isArray(values)) return [];
        if (values === "") return [];
        return values
            .map((v) => {
                const o = this.getOption(v);
                return o;
            })
            .filter((o) => o !== null);
    }

    sort(a, b) {
        const ao = this.getOption(a.getField(this.name));
        const bo = this.getOption(b.getField(this.name));
        if (ao === null && bo === null) return 0;
        if (ao === null) return -1;
        if (bo === null) return 1;
        return ao.optionIndex - bo.optionIndex;
    }

    renderFilterControl() {
        const container = super.renderFilterControl();

        const filterConfig = this.getFilterConfig();

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
            label.append(radio, this.getOptionLabel(opt));
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
            label.append(checkbox, this.getOptionLabel(opt));
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
        const { operator, value, values } = this.getFilterConfig();

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
