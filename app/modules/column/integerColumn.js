import { DecimalColumn } from "./decimalColumn.js";

export class IntegerColumn extends DecimalColumn {
    constructor(config) {
        super({
            ...config,
            columnConfig: { ...config.columnConfig, places: 0 },
        });
    }
}
