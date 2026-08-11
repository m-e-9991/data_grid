export class DataGrid {
    #container;
    #config;
    #data;
    #state;

    constructor (_container, _config, _data) {
        this.#container = _container;
        this.#config = _config;
        this.#data = _data;
        render();
    }

    render() {
        this.#container.textContent = "";
        const table = document.createElement("table");
        
    }
}
