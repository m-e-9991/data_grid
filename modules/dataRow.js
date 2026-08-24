export class DataRow {
    #id;
    #fields = {};

    constructor(row, hardDelete) {
        const { id, ...rest } = row;
        this.#id = id;
        this.#fields = rest;
        if (!hardDelete && this.#fields.active === undefined) {
            this.#fields.active = true;
        }
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

    setField(columnName, value) {
        this.#fields[columnName] = value;
    }

    clone() {
        const copy = new DataRow({ id: this.#id, ...this.#fields });
        return copy;
    }
}