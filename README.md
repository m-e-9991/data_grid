# Data Grid

A config-driven data grid built from scratch in vanilla JavaScript — no
React, no Tabulator/AG-Grid, no framework. Define your columns and data
shape in a JSON config, and the grid renders, sorts, filters, paginates,
and edits itself accordingly.

Built as a learning project to understand what libraries like AG-Grid and
Tabulator are actually doing under the hood — DOM rendering, state
management, and a real (if minimal) backend — before reaching for one.

## Features

- **Config-driven columns** — one JSON file defines the whole table:
  column types, labels, validation rules (`min`/`max`, `required`),
  defaults, and option lists.
- **Typed columns** — Text, Date, Integer, Decimal, Select, Multi-Select,
  and Boolean, each with its own rendering, validation, and edit behavior.
- **Sorting** — click a column header to sort ascending/descending.
- **Filtering** — per-column filter popovers, type-aware (text search,
  numeric ranges, date ranges, option matching).
- **Pagination** — stable viewport regardless of dataset size.
- **Edit mode** — inline per-cell editing, add/remove rows, and dirty-state
  tracking (separately for updated, added, and removed rows) with a
  save/cancel workflow that only commits on confirmation.
- **Real persistence** — a hand-rolled Node server (see below) actually
  writes saved changes to disk, so edits survive a refresh.

## Architecture

- One class per file under `modules/`, with a `Column` base class and one
  subclass per column type (`modules/column/`).
- Columns don't hold a reference to the whole grid instance — each one is
  built via a factory that hands it a small set of pre-bound handler
  functions (`getSortDirection`, `commitUpdate`, `getFilterConfig`, etc.),
  scoped to that column only. Narrower surface area than passing the
  entire grid object around.

## The server

`node.js` is a minimal HTTP server written directly against Node's
built-in `http`/`fs`/`path` modules — no Express, no framework. It:

- Serves the static files (HTML/CSS/JS/JSON) with correct `Content-Type`
  headers, and guards against path traversal outside the project directory.
- Exposes `POST /api/data/save`, which validates the incoming change set
  and writes the updated rows back to `data.json`.
- Logs every request and outcome (`[request]`, `[doGet]`, `[doPost]`,
  `[saveData]`, etc.) to stdout — captured in `app/server.log` when run via
  `server.sh`.

This was deliberately built by hand, one primitive at a time
(`req.on("data"/"end")` for streaming request bodies, manual routing,
manual MIME-type mapping), to actually understand what a framework like
Express normally does for you.

## Project structure

```text
data_grid/
├── README.md
└── app/
    ├── node.js              # the server (entry point)
    ├── index.html
    ├── style.css
    ├── table.ico            # favicon
    ├── config.json          # table/column definitions
    ├── data.json            # row data — read and written by the server
    └── modules/
        ├── dataGrid.js      # main grid class
        ├── dataRow.js
        └── column/
            ├── column.js    # base Column class
            ├── textColumn.js
            ├── dateColumn.js
            ├── integerColumn.js
            ├── decimalColumn.js
            ├── selectColumn.js
            ├── multiSelectColumn.js
            ├── booleanColumn.js
            └── index.js     # barrel re-export
```

## Running it

No build step, no dependencies to install.

```bash
cd app
node node.js
```

Then open `http://localhost:3000` in a browser.

To run it in the background — detached from the terminal, logging to a
file, and stoppable without hunting for a PID by hand — use `server.sh`:

```bash
./app/server.sh start     # runs it detached, logs to app/server.log
./app/server.sh status    # is it running?
./app/server.sh stop      # kills exactly this server, nothing else
./app/server.sh restart
```

It tracks the process by PID in `app/server.pid` (git-ignored), so `stop`
only ever kills the exact process it started — no pattern-matching
against process names that could catch an unrelated `node` process.

## Configuration

- `config.json` — table and column definitions (types, labels, validation,
  option lists).
- `data.json` — the row data itself; this is the file the server reads
  from and writes back to on save.

## Stack

Vanilla JavaScript (ES2022+, ES Modules), plain HTML/CSS, and Node.js
using only its built-in standard library — no frameworks anywhere in the
stack.
