"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Util_1 = require("../Util");
const IInsightFacade_1 = require("./IInsightFacade");
const fs = require("fs");
const FilterProcessor_1 = require("./FilterProcessor");
class QueryProcessor {
    constructor() {
        this.datasetToQueryName = "";
        this.columnKeys = [];
        Util_1.default.trace("New Query To Process");
    }
    printD() {
        return this.datasetToQueryName;
    }
    changeD() {
        this.datasetToQueryName = "changed";
    }
    query(que) {
        let that = this;
        return new Promise(function (resolve, reject) {
            if (!that.allValid(que)) {
                return reject(new IInsightFacade_1.InsightError("Something is not VALID"));
            }
            let data = fs.readFileSync("./data/" + that.datasetToQueryName + ".json");
            Util_1.default.trace(data);
            let result = [];
            let fp = new FilterProcessor_1.default();
            result = fp.filterProcess(data, que["WHERE"], que["OPTIONS"]);
            if (result.length > 5000) {
                return reject(new IInsightFacade_1.ResultTooLargeError());
            }
            return resolve(result);
        });
    }
    allValid(que) {
        if (!(this.structureValid(que))) {
            Util_1.default.trace("Invalid Query Structure");
            return false;
        }
        if (!(this.optionsValid(que["OPTIONS"]))) {
            Util_1.default.trace("Invalid Options Structure");
            return false;
        }
        if (!(this.columnsNotEmpty(que["OPTIONS"]["COLUMNS"]))) {
            Util_1.default.trace("Columns can't be empty");
            return false;
        }
        if (!(this.keysRegEx(que["OPTIONS"]["COLUMNS"]))) {
            Util_1.default.trace("Keys in Columns have invalid structures");
            return false;
        }
        this.getDatasetName(que["OPTIONS"]["COLUMNS"]);
        if (!(this.allKeyReference(que["OPTIONS"]["COLUMNS"]))) {
            Util_1.default.trace("Keys in Columns reference multiple datasets");
            return false;
        }
        if (!(this.allValidKeyCalls(que["OPTIONS"]["COLUMNS"]))) {
            Util_1.default.trace("Some keys in Columns are not valid");
            return false;
        }
        if (!(this.orderKeyInCol(que["OPTIONS"]))) {
            Util_1.default.trace("Key in Order is not in COLUMNS");
            return false;
        }
        if (!(this.whereKey(que["WHERE"]))) {
            Util_1.default.trace("Where contains more than one key");
            return false;
        }
        return true;
    }
    structureValid(que) {
        let opts = Object.keys(que);
        if (!(opts.length === 2)) {
            return false;
        }
        return ((opts.includes("WHERE")) && (opts.includes("OPTIONS")));
    }
    optionsValid(que) {
        let opts = Object.keys(que);
        if (opts.length === 0 || !opts.includes("COLUMNS")) {
            return false;
        }
        for (let key of opts) {
            if ((key !== "COLUMNS") && (key !== "ORDER")) {
                return false;
            }
        }
        return true;
    }
    columnsNotEmpty(que) {
        let size = (Object.keys(que)).length;
        return (size > 0);
    }
    keysRegEx(que) {
        let keys = Object.keys(que);
        for (let key of keys) {
            let str = que[key].toString();
            let match = RegExp(/^[^_]+[_][^_]+$/g).test(str);
            if (!match) {
                return false;
            }
        }
        return true;
    }
    getDatasetName(que) {
        let keys = Object.keys(que);
        let key = que[keys[0]];
        let datast = key.split("_");
        this.datasetToQueryName = datast[0];
        return datast[0];
    }
    allKeyReference(que) {
        let keys = Object.keys(que);
        for (let key of keys) {
            let datast = que[key].split("_");
            if (!(datast[0] === this.datasetToQueryName)) {
                return false;
            }
        }
        return true;
    }
    allValidKeyCalls(que) {
        let validKeys = ["dept", "id", "avg", "instructor", "title", "pass", "fail", "audit", "uuid", "year"];
        let keys = Object.keys(que);
        for (let key of keys) {
            let keyToCheck = que[key].split("_")[1];
            if (!(validKeys.includes(keyToCheck))) {
                return false;
            }
        }
        return true;
    }
    removeDuplicated(col) {
        let keys = Object.keys(col);
        let validKeys = [];
        for (let key of keys) {
            if (!validKeys.includes(key)) {
                validKeys.push(key);
            }
        }
        return validKeys;
    }
    orderKeyInCol(opt) {
        let order = opt["ORDER"];
        let columns = opt["COLUMNS"];
        for (let col of columns) {
            if (order === undefined || order === col) {
                return true;
            }
        }
        return false;
    }
    whereKey(que) {
        let obj = Object.keys(que);
        if (obj.length > 1) {
            return false;
        }
        let validKeys = ["AND", "NOT", "OR", "IS", "GT", "LT", "EQ"];
        return validKeys.includes(obj[0]);
    }
}
exports.default = QueryProcessor;
//# sourceMappingURL=QueryProcessor.js.map