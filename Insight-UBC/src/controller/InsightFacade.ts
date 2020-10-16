import Log from "../Util";
import {
    IInsightFacade,
    InsightDataset,
    InsightDatasetKind,
    InsightError,
    ISection,
    NotFoundError
} from "./IInsightFacade";
import JSZip = require("jszip");
import fs = require("fs");
import QueryProcessor from "./QueryProcessor";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

// let list: InsightDataset[]

export default class InsightFacade implements IInsightFacade {
    public list: InsightDataset[] = [];
    public idList: string[] = [];

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        let that = this;
        let allPromise: Array<Promise<string>> = [];
        return new Promise(function (resolve, reject) {
            let output: any[] = [];
            return that.checkValidDatasetId(id).then(function (validOrNot: boolean) {
                if (validOrNot && (that.existOrNot(that.list, id)) && that.checkNull(content, kind)) {
                    let zip1 = new JSZip();
                    zip1.loadAsync(content, {base64: true}).then(function (zip) {
                        zip.folder("courses").forEach(function (relativePath, file) {
                            allPromise.push(file.async("text"));
                        });
                        Log.trace("get after");
                        Promise.all(allPromise).then(function (result: string[]) {
                            output = that.readIntoSec(result);
                            Log.trace(output.length);
                            if (output.length !== 0) {
                                fs.writeFile("data/" + id + ".json", JSON.stringify(output), (err) => {
                                    if (err) {
                                        Log.trace("Reject savefile");
                                        return reject(new InsightError("Could not save file to disk"));
                                    }
                                });
                                Log.trace("after write");
                                let dds: InsightDataset = {id: "", kind: InsightDatasetKind.Courses, numRows: 0};
                                dds.id = id;
                                dds.kind = InsightDatasetKind.Courses;
                                dds.numRows = output.length;
                                that.list.push(dds);
                                that.idList.push(id);
                                Log.trace("before resolve： " + dds.numRows);
                                return resolve(that.idList);
                            } else {
                                return reject(new InsightError());
                            }
                        }).catch((err) => {
                            return reject(new InsightError("wrong"));
                        });
                    }).catch((err) => {
                        return reject(new InsightError("no valid section"));
                    });
                } else {
                    Log.trace("id incorrect");
                    reject(new InsightError());
                }
            }).catch((err) => {
                return reject(new InsightError("no valid section"));
            });
        });
    }
    public readIntoSec(AllFiles: string[]): ISection[] {
        let output: ISection[] = [];
        Log.trace("start to read");
        for (let str of AllFiles) {
            let obj = JSON.parse(str);
            let Sections = this.convertValidFileToSectionObjects(obj);
            for (let sec of Sections) {
                output.push(sec);
            }
        }
        Log.trace(output.length);
        return output;
    }
    public checkNull(con: string, k: InsightDatasetKind): boolean {
        Log.trace(con);
        return (con !== null) && (con !== undefined) && (k !== null) && (k !== undefined) &&
            (k !== InsightDatasetKind.Rooms);
    }

    public checkValidDatasetId(id: string): Promise<boolean> {
        let that = this;
        return new Promise(function (resolve, reject) {
            // CHANGE THIS DIRECTORY LATER
            // fs.readdirSync("test/dirTesting/").forEach((file) => {
            //     if (id === file) {
            //         reject(new InsightError("Dataset already exists in directory"));
            //     }
            // });
            let matchNotAllSpaces = RegExp(/\S/g).test(id);
            let matchNoUnderscore = RegExp(/^[^_]*$/g).test(id);
            if ((id !== null) && (id !== undefined) && (matchNotAllSpaces) && (matchNoUnderscore) &&
                (id !== "")) {
                Log.trace("id correct");
                resolve(true);
            } else {
                resolve(false);
            }
        });
    }

    // SPEC :: TAKE THE JSON OBJECT OF A FILE AND RETURN A OBJECT WITH ARRAY OF ISections AND NUMROWS for THAT FILE
    // NOTE THAT WE ARE EXPECTING THIS OBJECT TO BE A VALID JSON STRING! Resolve if file has at least 1 valid section
    public convertValidFileToSectionObjects(file: any): ISection[] {
        let that = this;
        let sections: ISection[] = [];
        let numRows: number = 0;
        let potentialSectionsToAddObject = file["result"];
        // let potentialSectionsToAddKeys = Object.keys(file["result"]);
        let i = 0;
        for (let key in potentialSectionsToAddObject) {
            // Log.trace("looping key" + key);
            if (that.checkValidSection(potentialSectionsToAddObject[i])) {
                let tempSection: ISection = that.convert(potentialSectionsToAddObject[i]);
                sections.push(tempSection);
                numRows++;
            }
            i++;
        }
        return sections;
         // else {
        //     reject(new InsightError("No Valid Sections in this File"));
        // }
    }

    // SPEC :: ALL SECTIONS MUST HAVE ALL 10 KEYS. IF NOT, REJECT.
    public checkValidSection(section: any): boolean {
            // THIS OBJECT RECORDS WHETHER OR NOT IT HAS ENCOUNTERED EACH OF THE 10 KEYS IN THE SECTION PASSED IN
            let keysToBeContained: { [key: string]: boolean } = {Subject: false, Course: false, Avg: false, Professor:
                    false, Title: false, Pass: false, Fail: false, Audit: false, id: false, Year: false};
            // THIS SAYS IF ANY KEY IN THE SECTION IS NOT ONE OF THE ABOVE 10 KEYS, DO NOT ADD IT (unsure if it works)
            Object.seal(keysToBeContained);
            let keys = Object.keys(section);
            keys.forEach(function (key) {
                // originally seal was supposed to take this functionality but it appeared that when I tried to call
                // keysToBeContained[key] with a key that was non-existant in keysToBeContained, it broke the whole loop
                if ((key === "Subject") || (key === "Course") || (key === "Avg") || (key === "Professor") ||
                    (key === "Title") || (key === "Pass") || (key === "Fail") || (key === "Audit") ||
                    (key === "id") || (key === "Year")) {
                    keysToBeContained[key] = true;
                    // Log.trace(section[key]);
                }
            });
            // keep track of the number of keys that were encountered. Want all 10 to fulfill promise.
            let numContained = 0;
            // Log.trace(numContained);
            let keysToCheck = Object.keys(keysToBeContained);
            // Log.trace(keysToBeContained);
            keysToCheck.forEach(function (key) {
                if (keysToBeContained[key] === true) {
                    // Log.trace(key);
                    // Log.trace(keysToBeContained[key]);
                    numContained++;
                    // Log.trace(numContained);
                }
            });
            if (numContained === 10) {
                return true;
            } else {
                return false;
            }
    }
    public convert(couSec: any): any {
        // let secs: ISection[];
        let sec: ISection = {dept: "", id: "", avg: 0, instructor: "", title: "", pass: 0
            , fail: 0, audit: 0, uuid: "", year: 0};
        sec.dept = couSec["Subject"];
        sec.id = couSec["Course"];
        sec.avg = couSec["Avg"];
        sec.instructor = couSec["Professor"];
        sec.title = couSec["Title"];
        sec.pass = couSec["Pass"];
        sec.fail = couSec["Fail"];
        sec.audit = couSec["Audit"];
        sec.uuid = couSec["id"].toString;
        sec.year = parseInt(couSec["Year"], 10);
            // secs.push(sec);
        return sec;
    }
    public existOrNot(input: InsightDataset[], givenId: string): boolean {
        for (let isd of input) {
            if (isd.id === givenId) {
                return false;
            }
        }
        return true;
    }

    public removeDataset(id: string): Promise<string> {
        let that = this;
        return new Promise(function (resolve, reject) {
            return that.checkValidDatasetId(id).then(function (valid: boolean) {
                if (valid && !(that.existOrNot(that.list, id))) {
                    fs.unlink("./data/" + id + ".json", (err) => {
                        if (err) {
                            return reject (err);
                        }
                    });
                    let i = 0;
                    for (let ds of that.list) {
                        if (that.list[i].id === id) {
                            that.list.splice(i, 1);
                            Log.trace(that.list.length);
                            break;
                        } else {
                            i++;
                        }
                    }
                    return resolve(id);
                } else {
                    if (that.existOrNot(that.list, id)) {
                        return reject(new NotFoundError());
                    } else {
                        return reject(new InsightError());
                    }
                }
            }).catch((err) => {
                return reject(new InsightError());
            });
        });
    }

    public performQuery(query: any): Promise <any[]> {
        return new Promise(function (resolve, reject) {
            let qp = new QueryProcessor();
            qp.query(query).then(function (result: any[]) {
                resolve(result);
            }).catch(function (err) {
                reject(err);
            });
        });
    }

    public listDatasets(): Promise<InsightDataset[]> {
        let that = this;
        return new Promise(function (resolve, reject) {
           return resolve(that.list);
        });
    }
}
