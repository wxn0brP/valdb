# ValtheraDB Bin Plugin

**This is an experimental project.**

This is a proof-of-concept for an addon/plugin for the `@wxn0brp/db` (ValtheraDB) library.

The purpose of this experiment is to create a storage layer that allows ValtheraDB, which normally operates on a directory/file structure, to instead use a single binary file for data storage.

The code in this repository is not actively maintained and should be considered a work in progress. It was created as an experiment and may be continued in the future.

## Installation

```bash
yarn add github:wxn0brP/ValtheraDB-plugin-bin#dist
```

## Usage

### Initialization

To get started, create a new `BinValthera` instance:

```typescript
import { createBinValthera } from "@wxn0brp/db-plugin-bin";

const { db, actions, mgr } = await createBinValthera("test.val", { preferredSize: 4096 });
```

This will create a new binary file named `test.val` (if it doesn't exist) and initialize the database.

### Basic

The `db` object is an instance of `ValtheraClass` and supports the standard ValtheraDB methods.

### Optimizing the Database

This will reclaim unused space in the binary file.

```typescript
await mgr.optimize();
```

## API

### `createBinValthera(path, opts, init)`

-   `path`: The path to the binary file.
-   `opts`: Options for the `BinManager`.
-   `init`: Whether to initialize the database upon creation (default: `true`).

Returns an object containing:
-   `db`: An instance of `ValtheraClass`.
-   `actions`: An instance of `BinFileAction`.
-   `mgr`: An instance of `BinManager`.

### `BinManager(path, options)`

-   `path`: The path to the binary file.
-   `options`:
    -   `preferredSize`: The preferred block size for the database (default: `256`).

## License

This project is licensed under the MIT License.
