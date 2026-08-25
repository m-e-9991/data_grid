import { createServer } from "node:http";
import fs from "node:fs";
import path from "node:path";

const BASE_DIR = import.meta.dirname;

function main(req, res) {
    switch (req.method) {
        case "GET": {
            doGet(req, res);
            break;
        }
        case "POST": {
            doPost(req, res);
            break;
        }
        default: {
            res.writeHead(405);
            res.end();
            break;
        }
    }
}

function doGet(req, res) {
    const url = new URL(req.url, "http://localhost");
    const urlPath = url.pathname === "/" ? "index.html" : url.pathname;
    const filePath = path.join(BASE_DIR, urlPath);

    if (!filePath.startsWith(BASE_DIR + path.sep)) {
        res.writeHead(404);
        res.end();
        return;
    }

    let content;
    try {
        content = fs.readFileSync(filePath);
    } catch (error) {
        res.writeHead(404);
        res.end();
        return;
    }

    const contentTypes = {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "application/javascript",
        ".json": "application/json",
    };
    const type =
        contentTypes[path.extname(filePath)] ?? "application/octet-stream";

    res.writeHead(200, { "Content-Type": type });
    res.end(content);
}

function doPost(req, res) {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
        const body = Buffer.concat(chunks).toString();
        let data;
        try {
            data = JSON.parse(body);
        } catch (error) {
            res.writeHead(400);
            res.end();
            return;
        }
        handlePost(req, res, data);
    });
}

function handlePost(req, res, data) {
    const url = new URL(req.url, "http://localhost");
    const urlPath = url.pathname;

    switch (urlPath) {
        case "/api/data/save": {
            let response;
            try {
                response = saveData(data);
            } catch (error) {
                res.writeHead(400);
                res.end(error.message);
                return;
            }
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end(response);
            break;
        }
        default: {
            res.writeHead(404);
            res.end();
        }
    }
}

function saveData(data) {
    const check =
        Array.isArray(data) && data.every((o) => typeof o === "object");
    if (!check) {
        throw new Error("Bad data format");
    }

    const dataPath = path.join(BASE_DIR, "/data.json");

    const dataContetnt = fs.readFileSync(dataPath);

    const currentData = JSON.parse(dataContetnt);

    let newData = [...currentData];

    const added = data
        .filter((c) => c.operation === "add")
        .map((c) => ({
            id: c.rowId,
            ...Object.fromEntries(c.values.map((v) => [v.columnName, v.value])),
        }));

    const deletedIds = data
        .filter((c) => c.operation === "delete")
        .map((c) => c.rowId);

    const updated = data.filter((c) => c.operation === "update");

    newData.push(...added);

    newData = newData.filter((d) => !deletedIds.includes(d.id));

    updated.forEach((c) => {
        const r = newData.find((rr) => rr.id === c.rowId);
        if (!r) return;
        c.values.forEach((v) => {
            r[v.columnName] = v.newVal;
        });
    });

    fs.writeFileSync(dataPath, JSON.stringify(newData, null, 4));

    return "Data written successfully";
}

const server = createServer(main);

server.listen(3000);
