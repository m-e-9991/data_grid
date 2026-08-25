import { SelectColumn } from "./selectColumn.js";

export class MultiSelectColumn extends SelectColumn {
    constructor(config) {
        super(config);
    }

    renderData(value) {
        return this.formatList(value);
    }

    formatList(list) {
        if (!Array.isArray(list)) return "";
        const options = this.getOptionList(list);
        options.sort((a, b) => a.optionIndex - b.optionIndex);
        if (options.length === 0) return "";

        return options.reduce((s, o) => {
            let l = this.getOptionLabel(o);
            if (s !== "" && l !== "") s += ", ";
            s += l;
            return s;
        }, "");
    }

    renderInputField(value) {
        const button = document.createElement("button");
        button.type = "button";
        button.append(this.formatList(value));
        button.addEventListener("click", () => {
            const container = button.closest("dialog") ?? document.body;
            container.append(overlay, dialog);
            dialog.show();

            const rect = button.getBoundingClientRect();
            dialog.style.top = rect.bottom + "px";
            dialog.style.left = rect.left + "px";
            dialog.style.width = rect.width + "px";
        });

        const dialog = document.createElement("dialog");
        dialog.className = "multiselect-edit-options";

        const overlay = document.createElement("div");
        overlay.className = "filter-overlay";

        dialog.addEventListener("mousedown", (e) => {
            if (e.target.tagName !== "INPUT") {
                e.preventDefault();
            }
        });

        const optionList = [...this.optionList];
        optionList.sort((a, b) => a.optionIndex - b.optionIndex);
        optionList.forEach((o) => {
            const label = document.createElement("label");
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.value = o.optionValue;
            checkbox.checked = value?.includes(o.optionValue) ?? false;
            label.append(checkbox, this.getOptionLabel(o));
            label.addEventListener("click", (e) => {
                if (e.target === checkbox) return;
                e.preventDefault();
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event("input", { bubbles: true }));
            });

            dialog.append(label);
        });

        dialog.addEventListener("input", () => {
            button.replaceChildren(this.formatList(this.getInputValue(button)));
            button.dispatchEvent(new Event("input"));
        });

        overlay.addEventListener("click", () => {
            dialog.close();
            dialog.remove();
            overlay.remove();
            button.focus();
        });

        button.dialog = dialog;

        return button;
    }

    isPartOfInputField(input, element) {
        return (
            input.contains(element) ||
            (input.dialog?.contains(element) ?? false)
        );
    }

    getInputValue(input) {
        return [...input.dialog.querySelectorAll("input:checked")].map(
            (cb) => cb.value,
        );
    }

    isEmpty(value) {
        return value.length === 0;
    }

    get defaultValue() {
        return [];
    }

    sort(a, b) {
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

    compare(a, b) {
        const aol = this.getOptionList(a);
        aol.sort((aa, bb) => aa.optionIndex - bb.optionIndex);
        const bol = this.getOptionList(b);
        bol.sort((aa, bb) => aa.optionIndex - bb.optionIndex);
        if (aol.length !== bol.length) {
            return false;
        }
        for (let i = 0; i < aol.length; ++i) {
            if (aol[i] !== bol[i]) {
                return false;
            }
        }
        return true;
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

        const filterConfig = this.getFilterConfig();

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

        const { operator, values } = this.getFilterConfig();

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
