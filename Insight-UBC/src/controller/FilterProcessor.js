"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Util_1 = require("../Util");
class FilterProcessor {
    constructor() {
        Util_1.default.trace("New Query To Filter");
    }
    filterProcess(data, que, options) {
        Util_1.default.trace("get into filter");
        let secObj = JSON.parse(data.toString());
        let res = [];
        if (Object.keys(que).length === 0) {
            return secObj;
        }
        res = this.recursion(secObj, que);
        let showResult = this.display(res, options);
        return showResult;
    }
    recursion(recurData, filterQue) {
        let key = Object.keys(filterQue)[0];
        let recurRes = [];
        if (key === "IS") {
            recurRes = this.filterIS(recurData, filterQue[key]);
        }
        else if (key === "GT") {
            recurRes = this.filterGT(recurData, filterQue[key]);
        }
        else if (key === "LT") {
            recurRes = this.filterLT(recurData, filterQue[key]);
        }
        else if (key === "EQ") {
            recurRes = this.filterEQ(recurData, filterQue[key]);
        }
        else if (key === "AND") {
            recurRes = recurData;
            for (let obj of filterQue[key]) {
                recurRes = this.recursion(recurRes, obj);
            }
        }
        else if (key === "OR") {
            for (let obj of filterQue[key]) {
                let tempRes = this.recursion(recurData, obj);
                for (let section of tempRes) {
                    recurRes.push(section);
                }
            }
        }
        else if (key === "NOT") {
            let notRes = this.recursion(recurData, filterQue[key]);
            for (let section of recurData) {
                if (!notRes.includes(section)) {
                    recurRes.push(section);
                }
            }
        }
        return recurRes;
    }
    filterIS(input, require) {
        let result = [];
        let key = Object.keys(require)[0].split("_")[1];
        let val = require[key];
        for (let sec of input) {
            if (sec[key] === val) {
                result.push(sec);
            }
        }
        return result;
    }
    filterGT(input, require) {
        let result = [];
        let key = Object.keys(require)[0].split("_")[1];
        let val = require[key];
        for (let sec of input) {
            if (sec[key] > val) {
                result.push(sec);
            }
        }
        return result;
    }
    filterLT(input, require) {
        let result = [];
        let key = Object.keys(require)[0].split("_")[1];
        let val = require[key];
        for (let sec of input) {
            if (sec[key] < val) {
                result.push(sec);
            }
        }
        return result;
    }
    filterEQ(input, require) {
        let result = [];
        let key = Object.keys(require)[0].split("_")[1];
        let val = require[key];
        for (let sec of input) {
            if (sec[key] === val) {
                result.push(sec);
            }
        }
        return result;
    }
    display(result, opt) {
        let sortResult = [];
        let final = [];
        let finalKeys = [];
        for (let colKey of opt["COLUMNS"]) {
            let key = colKey.split("_")[1];
            finalKeys.push(key);
        }
        if (opt["ORDER"] === undefined) {
            sortResult = this.sort(result, finalKeys[0]);
        }
        else {
            let sortOrder = opt["ORDER"].split("_")[1];
            sortResult = this.sort(result, sortOrder);
        }
        for (let sec of sortResult) {
            let finalSec = {};
            for (let key of finalKeys) {
                finalSec[key] = sec[key];
            }
            final.push(finalSec);
        }
        return final;
    }
    sort(input, sortKey) {
        let sortFn = (obj1, obj2) => {
            if (obj1[sortKey] < obj2[sortKey]) {
                return -1;
            }
            if (obj1[sortKey] > obj2[sortKey]) {
                return 1;
            }
        };
        return input.sort(sortFn);
    }
}
exports.default = FilterProcessor;
//# sourceMappingURL=FilterProcessor.js.map