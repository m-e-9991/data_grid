import { Column } from "./column.js";

export class DateColumn extends Column {
    #default;

    constructor(config) {
        super(config);
        this.#default = config.columnConfig.default ?? "today";
    }

    get defaultValue() {
        const date =
            this.#default === "today" ? new Date() : new Date(this.#default);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    renderData(value) {
        return String(value) ?? "";
    }

    renderInputField(value) {
        const date = document.createElement("input");
        date.type = "date";
        date.value = value;
        return date;
    }

    isValidInput(value) {
        return (
            super.isValidInput(value) &&
            (value === "" || !Number.isNaN(new Date(value).getTime()))
        );
    }

    sort(a, b) {
        return (
            new Date(a.getField(this.name)) - new Date(b.getField(this.name))
        );
    }

    renderFilterControl() {
        const container = super.renderFilterControl();

        const filterConfig = this.getFilterConfig();

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
        const { operator, value, endValue } = this.getFilterConfig();

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

    compare(a, b) {
        const ad = new Date(a);
        const bd = new Date(b);
        return ad.getTime() === bd.getTime();
    }
}
