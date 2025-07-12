import { CustomFileCpu, genId } from "@wxn0brp/db-core";
import dbActionBase from "@wxn0brp/db-core/base/actions";
import { compareSafe } from "@wxn0brp/db-core/utils/sort";
export class BinFileAction extends dbActionBase {
    mgr;
    folder;
    options;
    fileCpu;
    /**
     * Creates a new instance of dbActionC.
     * @constructor
     * @param folder - The folder where database files are stored.
     * @param options - The options object.
     */
    constructor(mgr) {
        super();
        this.mgr = mgr;
        this.fileCpu = new CustomFileCpu(this.mgr.read.bind(this.mgr), this.mgr.write.bind(this.mgr));
    }
    async init() {
        await this.mgr.open();
    }
    _getCollectionPath(collection) {
        throw new Error("Method not implemented.");
        return "";
    }
    /**
     * Get a list of available databases in the specified folder.
     */
    async getCollections() {
        const collections = this.mgr.openResult.collections.map(c => c.name);
        return collections;
    }
    /**
     * Check and create the specified collection if it doesn't exist.
     */
    async checkCollection({ collection }) {
        if (await this.issetCollection(arguments[0]))
            return;
        await this.mgr.write(collection, []);
        return true;
    }
    /**
     * Check if a collection exists.
     */
    async issetCollection({ collection }) {
        const collections = await this.getCollections();
        return collections.includes(collection);
    }
    /**
     * Add a new entry to the specified database.
     */
    async add({ collection, data, id_gen = true }) {
        await this.checkCollection(arguments[0]);
        if (id_gen)
            data._id = data._id || genId();
        await this.fileCpu.add(collection, data);
        return data;
    }
    /**
     * Find entries in the specified database based on search criteria.
     */
    async find({ collection, search, context = {}, dbFindOpts = {}, findOpts = {} }) {
        const { reverse = false, max = -1, offset = 0, sortBy, sortAsc = true } = dbFindOpts;
        await this.checkCollection(arguments[0]);
        let data = await this.fileCpu.find(collection, search, context, findOpts);
        if (reverse)
            data.reverse();
        if (sortBy) {
            const dir = sortAsc ? 1 : -1;
            data.sort((a, b) => compareSafe(a[sortBy], b[sortBy]) * dir);
        }
        if (offset > 0) {
            if (data.length <= offset)
                return [];
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
    async findOne({ collection, search, context = {}, findOpts = {} }) {
        await this.checkCollection(arguments[0]);
        let data = await this.fileCpu.findOne(collection, search, context, findOpts);
        return data || null;
    }
    /**
     * Update entries in the specified database based on search criteria and an updater function or object.
     */
    async update({ collection, search, updater, context = {} }) {
        await this.checkCollection(arguments[0]);
        return await this.fileCpu.update(collection, false, search, updater, context);
    }
    /**
     * Update the first matching entry in the specified database based on search criteria and an updater function or object.
     */
    async updateOne({ collection, search, updater, context = {} }) {
        await this.checkCollection(arguments[0]);
        return await this.fileCpu.update(collection, true, search, updater, context);
    }
    /**
     * Remove entries from the specified database based on search criteria.
     */
    async remove({ collection, search, context = {} }) {
        await this.checkCollection(arguments[0]);
        return await this.fileCpu.remove(collection, false, search, context);
    }
    /**
     * Remove the first matching entry from the specified database based on search criteria.
     */
    async removeOne({ collection, search, context = {} }) {
        await this.checkCollection(arguments[0]);
        return await this.fileCpu.remove(collection, true, search, context);
    }
    /**
     * Removes a database collection from the file system.
     */
    async removeCollection({ collection }) {
        await this.mgr.removeCollection(collection);
        return true;
    }
}
