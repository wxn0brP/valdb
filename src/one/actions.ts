import { CustomFileCpu, genId } from "@wxn0brp/db";
import dbActionBase from "@wxn0brp/db/base/actions.js";
import Data from "@wxn0brp/db/types/data.js";
import FileCpu from "@wxn0brp/db/types/fileCpu.js";
import { VQuery } from "@wxn0brp/db/types/query.js";
import { read, write } from "./fn";
import { DbOpts } from "@wxn0brp/db/types/options.js";
import { compareSafe } from "@wxn0brp/db/utils/sort.js";
import { existsSync } from "fs";

export class OneFileAction extends dbActionBase {
    folder: string;
    options: DbOpts;
    fileCpu: FileCpu;

    /**
     * Creates a new instance of dbActionC.
     * @constructor
     * @param folder - The folder where database files are stored.
     * @param options - The options object.
     */
    constructor(private file: string) {
        super();
        this.fileCpu = new CustomFileCpu(read, write);
    }

    async init() {
        if (!existsSync(this.file)) {
            await write(this._getCollectionPath(null), {});
        }
    }

    _getCollectionPath(collection: string) {
        return JSON.stringify([this.file, collection]);
    }

    /**
     * Get a list of available databases in the specified folder.
     */
    async getCollections() {
        const collections = Object.keys(await read(this._getCollectionPath(null)));
        return collections;
    }

    /**
     * Check and create the specified collection if it doesn't exist.
     */
    async checkCollection({ collection }: VQuery) {
        if (this.issetCollection(collection)) return;
        const path = this._getCollectionPath(collection);
        const data = await read(path);
        data[collection] = data[collection] || [];
        await write(path, data);
        return true;
    }
    /**
     * Check if a collection exists.
     */
    async issetCollection({ collection }: VQuery) {
        const collections = await this.getCollections();
        return collections.includes(collection);
    }

    /**
     * Add a new entry to the specified database.
     */
    async add({ collection, data, id_gen = true }: VQuery) {
        collection = this._getCollectionPath(collection);
        await this.checkCollection(arguments[0]);

        if (id_gen) data._id = data._id || genId();
        await this.fileCpu.add(collection, data);
        return data;
    }

    /**
     * Find entries in the specified database based on search criteria.
     */
    async find({ collection, search, context = {}, dbFindOpts = {}, findOpts = {} }: VQuery) {
        collection = this._getCollectionPath(collection);
        const {
            reverse = false,
            max = -1,
            offset = 0,
            sortBy,
            sortAsc = true
        } = dbFindOpts;

        await this.checkCollection(collection);

        let data = await this.fileCpu.find(collection, search, context, findOpts) as Data[];

        if (reverse) data.reverse();

        if (sortBy) {
            const dir = sortAsc ? 1 : -1;
            data.sort((a, b) => compareSafe(a[sortBy], b[sortBy]) * dir);
        }

        if (offset > 0) {
            if (data.length <= offset) return [];
            data = data.slice(offset);
        }

        if (max !== -1 && data.length > max) {
            data = data.slice(0, max);
        }

        return data;
    }

    /**
     * Find the first matching entry in the specified database based on search criteria.
     */
    async findOne({ collection, search, context = {}, findOpts = {} }: VQuery) {
        collection = this._getCollectionPath(collection);
        await this.checkCollection(arguments[0]);
        let data = await this.fileCpu.findOne(collection, search, context, findOpts) as Data;
        return data || null;
    }

    /**
     * Update entries in the specified database based on search criteria and an updater function or object.
     */
    async update({ collection, search, updater, context = {} }: VQuery) {
        collection = this._getCollectionPath(collection);
        await this.checkCollection(arguments[0]);
        return await this.fileCpu.update(collection, false, search, updater, context);
    }

    /**
     * Update the first matching entry in the specified database based on search criteria and an updater function or object.
     */
    async updateOne({ collection, search, updater, context = {} }: VQuery) {
        collection = this._getCollectionPath(collection);
        await this.checkCollection(arguments[0]);
        return await this.fileCpu.update(collection, true, search, updater, context);
    }

    /**
     * Remove entries from the specified database based on search criteria.
     */
    async remove({ collection, search, context = {} }: VQuery) {
        collection = this._getCollectionPath(collection);
        await this.checkCollection(arguments[0]);
        return await this.fileCpu.remove(collection, false, search, context);
    }

    /**
     * Remove the first matching entry from the specified database based on search criteria.
     */
    async removeOne({ collection, search, context = {} }: VQuery) {
        collection = this._getCollectionPath(collection);
        await this.checkCollection(arguments[0]);
        return await this.fileCpu.remove(collection, true, search, context);
    }

    /**
     * Removes a database collection from the file system.
     */
    async removeCollection({ collection }: VQuery) {
        const path = this._getCollectionPath(collection);
        const data = await read(path);
        delete data[collection];
        await write(path, data);
        return true;
    }
}