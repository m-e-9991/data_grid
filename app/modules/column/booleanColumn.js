import { Column } from "./column.js";

export class BooleanColumn extends Column {
    constructor(config) {
        super(config);
    }

    renderData(value) {
        const toggle = document.createElement("span");
        toggle.className = "toggle";
        toggle.classList.toggle("on", value);
        const knob = document.createElement("span");
        knob.className = "toggle-knob";
        toggle.append(knob);
        return toggle;
    }

    renderInputField(value) {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = value;
        checkbox.className = "toggle-checkbox";
        return checkbox;
    }

    getInputValue(input) {
        return input.checked;
    }

    get defaultValue() {
        return true;
    }

    renderFilterControl() {
        const container = super.renderFilterControl();

        const filterConfig = this.getFilterConfig();

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

        const { value } = this.getFilterConfig();

        return v === value;
    }
}
