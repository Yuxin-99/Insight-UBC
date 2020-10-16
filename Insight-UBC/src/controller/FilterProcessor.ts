import Log from "../Util";
import {IFilterProcessor} from "./IFilterProcessor";
import {InsightError, ISection} from "./IInsightFacade";

export default class FilterProcessor implements IFilterProcessor {
    constructor() {
        Log.trace("New Query To Filter");
    }
    // SPEC: data is the dataset based on; que is the content inside "WHERE"; doesn't handle "ResultTooLargeErr"
    public filterProcess(data: any, que: any, options: any): any[] {
        Log.trace("get into filter");
        let secObj = JSON.parse(data.toString());
        let res: any[] = [];
        if (Object.keys(que).length === 0) {
            return secObj;
        }
        res = this.recursion (secObj, que);
        let showResult = this.display (res, options);
        return showResult;
    }
    // SPEC: recursion function for "AND", "OR", and base cases
    public recursion(recurData: any[], filterQue: any): any[] {
        let key = Object.keys(filterQue)[0];
        let recurRes: any[] = [];
        if (key === "IS") {
            recurRes = this.filterIS(recurData, filterQue[key]);
        } else if (key === "GT") {
            recurRes = this.filterGT(recurData, filterQue[key]);
        } else if (key === "LT") {
            recurRes = this.filterLT(recurData, filterQue[key]);
        } else if (key === "EQ") {
            recurRes = this.filterEQ(recurData, filterQue[key]);
        } else if (key === "AND") {
            // let andArrayFilter = filterQue[key];
            recurRes = recurData;
            for (let obj of filterQue[key]) {
                recurRes = this.recursion(recurRes, obj);
            }
            // recurRes = this.filterAND(recurData, filterQue[key]);
        } else if (key === "OR") {
            for (let obj of filterQue[key]) {
                let tempRes = this.recursion(recurData, obj);
                for (let section of tempRes) {
                    recurRes.push(section);
                }
            }
        } else if (key === "NOT") {
            let notRes = this.recursion(recurData, filterQue[key]);
            for (let section of recurData) {
                if (!notRes.includes(section)) {
                    recurRes.push(section);
                }
            }
        }
        return recurRes;
    }
    // SPEC: filter result using "IS"
    public filterIS (input: any[], require: any): any[] {
        let result: any[] = [];
        let key: string = Object.keys(require)[0].split("_")[1];
        let val = require[key];
        for (let sec of input) {
            if (sec[key] === val) {
                result.push(sec);
            }
        }
        return result;
    }
    // SPEC: filter result using "GT"
    public filterGT (input: any[], require: any): any[] {
        let result: any[] = [];
        let key: string = Object.keys(require)[0].split("_")[1];
        let val = require[key];
        for (let sec of input) {
            if (sec[key] > val) {
                result.push(sec);
            }
        }
        return result;
    }
    // SPEC: filter result using "LT"
    public filterLT (input: any[], require: any): any[] {
        let result: any[] = [];
        let key: string = Object.keys(require)[0].split("_")[1];
        let val = require[key];
        for (let sec of input) {
            if (sec[key] < val) {
                result.push(sec);
            }
        }
        return result;
    }
    // SPEC: filter result using "EQ"
    public filterEQ (input: any[], require: any): any[] {
        let result: any[] = [];
        let key: string = Object.keys(require)[0].split("_")[1];
        let val = require[key];
        for (let sec of input) {
            if (sec[key] === val) {
                result.push(sec);
            }
        }
        return result;
    }
    public display(result: any[], opt: any): any[] {
        let sortResult: any[] = [];
        let final: any[] = [];
        let finalKeys: string[] = [];
        for (let colKey of opt["COLUMNS"]) {
            let key = colKey.split("_")[1];
            finalKeys.push(key);
        }
        if (opt["ORDER"] === undefined) {
            sortResult = this.sort(result, finalKeys[0]);
        } else {
            let sortOrder = opt["ORDER"].split("_")[1];
            sortResult = this.sort(result, sortOrder);
        }
        for (let sec of sortResult) {
            let finalSec: any = {};
            for (let key of finalKeys) {
                finalSec[key] = sec[key];
            }
            final.push(finalSec);
        }
        return final;
    }
    public sort(input: any[], sortKey: string): any[] {
        let sortFn = (obj1: any, obj2: any) =>  {
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
