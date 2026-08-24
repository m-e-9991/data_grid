import { Column } from "./column.js";

export class DecimalColumn extends Column {
    #places;
    #min;
    #max;

    constructor(config) {
        super(config);
        this.#places = config.columnConfig.places ?? 2;
        this.#min = config.columnConfig.min ?? null;
        this.#max = config.columnConfig.max ?? null;
    }

    get cellClass() {
        return "numeric-cell";
    }

    get defaultValue() {
        return 0;
    }

    renderData(value) {
        return value === "" ? "" : Number(value).toFixed(this.#places);
    }

    renderInputField(value) {
        const num = document.createElement("input");
        num.type = "number";

        if (this.#min !== null) {
            num.min = this.#min;
        }

        if (this.#max !== null) {
            num.max = this.#max;
        }

        num.step = Math.pow(10, -this.#places);

        num.value = value;

        if (this.#places === 0) {
            num.addEventListener("beforeinput", (e) => {
                if (e.data === ".") {
                    e.preventDefault();
                }
            });
        } else {
            num.addEventListener("input", () => {
                const input = num;
                if (input.value.includes(".")) {
                    const [intPart, decPart] = input.value.split(".");
                    if (decPart.length > this.#places) {
                        input.value =
                            intPart + "." + decPart.slice(0, this.#places);
                    }
                }
            });
        }

        return num;
    }

    isEmpty(value) {
        return !this.required || value !== 0;
    }

    isValidInput(value) {
        return (
            super.isValidInput(value) &&
            !Number.isNaN(Number(value)) &&
            (this.#min === null || Number(value) >= this.#min) &&
            (this.#max === null || Number(value) <= this.#max)
        );
    }

    parseValue(value) {
        return value === "" ? null : Number(value);
    }

    renderFilterControl() {
        const container = super.renderFilterControl();

        const filterConfig = this.getFilterConfig();

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
            num1.addEventListener("beforeinput", (e) => {
                if (e.data === ".") {
                    e.preventDefault();
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
            value: this.parseValue(this.filterElements.num1.value),
            maxValue: this.parseValue(this.filterElements.num2.value),
        };
    }

    get isValidFilter() {
        const { operator, value, maxValue } = this.filterConfig;
        if (operator === "b") {
            return (
                value !== "" &&
                (this.#min === null || Number(value) >= this.#min) &&
                (this.#max === null || Number(value) <= this.#max) &&
                maxValue !== "" &&
                (this.#min === null || Number(maxValue) >= this.#min) &&
                (this.#max === null || Number(maxValue) <= this.#max) &&
                Number(value) < Number(maxValue)
            );
        } else {
            return (
                value !== "" &&
                (this.#min === null || Number(value) >= this.#min) &&
                (this.#max === null || Number(value) <= this.#max)
            );
        }
    }

    filter(row) {
        const number = this.parseValue(row.getField(this.name));
        if (number === null) {
            return false;
        }
        const { operator, value, maxValue } = this.getFilterConfig();

        switch (operator) {
            case "e": {
                return number === value;
            }
            case "b": {
                return number >= value && number <= maxValue;
            }
            case "g": {
                return number > value;
            }
            case "l": {
                return number < value;
            }
            case "ge": {
                return number >= value;
            }
            case "le": {
                return number <= value;
            }
            default: {
                return true;
            }
        }
    }
}
