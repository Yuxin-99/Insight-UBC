import Log from "../Util";
import {IQueryProcessor} from "./IQueryProcessor";
import {InsightError, ResultTooLargeError} from "./IInsightFacade";
import fs = require("fs");
import {IFilterProcessor} from "./IFilterProcessor";
import FilterProcessor from "./FilterProcessor";

export default class QueryProcessor implements IQueryProcessor {

    constructor() {
        Log.trace("New Query To Process");
    }

    private datasetToQueryName: string = "";
    private columnKeys: string[] = [];

    public printD() {
        return this.datasetToQueryName;
    }

    public changeD() {
        this.datasetToQueryName = "changed";
    }

    public query(que: any): Promise<any[]> {
        let that = this;
        return new Promise<any[]>(function (resolve, reject) {
            if (!that.allValid(que)) {
                return reject(new InsightError("Something is not VALID"));
            }
            // let whereObj = que["WHERE"];
            let data = fs.readFileSync("./data/" + that.datasetToQueryName + ".json");
            Log.trace(data);
            let result: any[] = [];
            // let secObj = JSON.parse(data.toString());
            // Log.trace(secObj);
            let fp: IFilterProcessor = new FilterProcessor();
            result = fp.filterProcess(data, que["WHERE"], que["OPTIONS"]);
            if (result.length > 5000) {
                return reject(new ResultTooLargeError());
            }
            return resolve(result);
        });
    }
    public allValid(que: any): boolean {
        if (!(this.structureValid(que))) {
            Log.trace("Invalid Query Structure");
            return false;
        }
        if (!(this.optionsValid(que["OPTIONS"]))) {
            Log.trace("Invalid Options Structure");
            return false;
        }
        if (!(this.columnsNotEmpty(que["OPTIONS"]["COLUMNS"]))) {
            Log.trace("Columns can't be empty");
            return false;
        }
        if (!(this.keysRegEx(que["OPTIONS"]["COLUMNS"]))) {
            Log.trace("Keys in Columns have invalid structures");
            return false;
        }
        this.getDatasetName(que["OPTIONS"]["COLUMNS"]);
        if (!(this.allKeyReference(que["OPTIONS"]["COLUMNS"]))) {
            Log.trace("Keys in Columns reference multiple datasets");
            return false;
        }
        if (!(this.allValidKeyCalls(que["OPTIONS"]["COLUMNS"]))) {
            Log.trace("Some keys in Columns are not valid");
            return false;
        }
        if (!(this.orderKeyInCol(que["OPTIONS"]))) {
            Log.trace("Key in Order is not in COLUMNS");
            return false;
        }
        if (!(this.whereKey(que["WHERE"]))) {
            Log.trace("Where contains more than one key");
            return false;
        }
        return true;
    }

    // SPEC :: Checks to see that the query contains both and only WHERE AND OPTIONS
    // TEST FIRST - SHOULD PASS IN THE ENTIRE ORIGINAL QUERY
    public structureValid(que: any): boolean {
        let opts = Object.keys(que);
        if (!(opts.length === 2)) {
            return false;
        }
        return ((opts.includes("WHERE")) && (opts.includes("OPTIONS")));
    }

    // SPEC :: Checks to see if OPTIONS contains Columns and either contains Order or not in the order Columns, Order
    // TEST SECOND - SHOULD ONLY PASS IN OriginalQuery["OPTIONS"]
    public optionsValid(que: any): boolean {
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

    // SPEC :: Check Columns in a non-empty array
    // TEST THIRD - PASS IN OriginalQuery["OPTIONS]["COLUMNS"]
    public columnsNotEmpty(que: any): boolean {
        let size = (Object.keys(que)).length;
        return (size > 0);
    }

    // SPEC :: Check the keys of que, should assert exactly 1 underscore in all column keys that is not first or last
    //         character in the key
    // TEST FOURTH (FOR COLUMNS) - PASS IN A QUERY THAT CONTAINS DATASET_KEY OBJECTS
    public keysRegEx(que: any): boolean {
        let keys = Object.keys(que);
        // Log.trace(que);
        for (let key of keys) {
            let str: string = que[key].toString();
            let match = RegExp(/^[^_]+[_][^_]+$/g).test(str);
            if (!match) {
                return false;
            }
            // Log.trace((str.match(/^[^_]+[_][^_]+$/g)) + "Trace regxp result");
        }
        return true;
    }

    // SPEC :: Set datasetToQuery as the name of the first dataset referenced in columns
    // SHOULD ALREADY BE CHECKED AGAINST SPLITS WITH NO UNDERSCORE BY REGEX CALL ABOVE
    // TEST FIFTH - PASS IN OriginalQuery["OPTIONS"]["COLUMNS"]
    public getDatasetName(que: any): string {
        let keys = Object.keys(que);
        let key = que[keys[0]];
        let datast = key.split("_");
        this.datasetToQueryName = datast[0];
        return datast[0];
    }

    // SPEC :: Return true if all keys reference the dataset stored in this.datasetToQuery else return false
    // TEST SIXTH FOR COLUMNS - Pass in any query that contains DATASET_KEYS
    public allKeyReference(que: any): boolean {
        let keys = Object.keys(que);
        for (let key of keys) {
            let datast = que[key].split("_");
            if (!(datast[0] === this.datasetToQueryName)) {
                return false;
            }
        }
        return true;
    }

    // SPEC :: returns true if all the keys called are valid, false otherwise
    // TEST SEVENTH FOR COLUMNS - Pass in any query that contains DATASET_KEYS
    public allValidKeyCalls(que: any): boolean {
        let validKeys: string[] = ["dept", "id", "avg", "instructor", "title", "pass", "fail", "audit", "uuid", "year"];
        let keys = Object.keys(que);
        for (let key of keys) {
            let keyToCheck = que[key].split("_")[1];
            if (!(validKeys.includes(keyToCheck))) {
                return false;
            }
        }
        return true;
    }

    // SPEC :: returns array of all valid keys removing duplicates
    public removeDuplicated(col: any): string[] {
        let keys = Object.keys(col);
        let validKeys: string[] = [];
        for (let key of keys) {
            if (!validKeys.includes(key)) {
                validKeys.push(key);
            }
        }
        return validKeys;
    }

    // SPEC: check if keys in "ORDER" is in "COLUMNS"
    public orderKeyInCol(opt: any): boolean {
        let order = opt["ORDER"];
        let columns = opt["COLUMNS"];
        for (let col of columns) {
            if (order === undefined || order === col) {
                return true;
            }
        }
        return false;
    }
    public whereKey (que: any): boolean {
        let obj = Object.keys(que);
        if (obj.length > 1) {
            return false;
        }
        let validKeys: string[] = ["AND", "NOT", "OR", "IS", "GT", "LT", "EQ"];
        return validKeys.includes(obj[0]);
    }
}
