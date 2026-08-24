import { Column } from "./column.js";

export class TextColumn extends Column {
    constructor(config) {
        super(config);
    }

    renderData(value) {
        return String(value) ?? "";
    }

    renderInputField(value) {
        const text = document.createElement("input");
        text.type = "text";
        text.value = value;
        return text;
    }

    isValidInput(value) {
        return super.isValidInput(value);
    }

    sort(a, b) {
        const as = a.getField(this.name);
        const bs = b.getField(this.name);
        return as.localeCompare(bs);
    }

    renderFilterControl() {
        const container = super.renderFilterControl();

        const filterConfig = this.getFilterConfig();

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
        const { operator, value, caseSensitive } = this.getFilterConfig();
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
