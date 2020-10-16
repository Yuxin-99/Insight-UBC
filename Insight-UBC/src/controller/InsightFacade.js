"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Util_1 = require("../Util");
const IInsightFacade_1 = require("./IInsightFacade");
const JSZip = require("jszip");
const fs = require("fs");
const QueryProcessor_1 = require("./QueryProcessor");
class InsightFacade {
    constructor() {
        this.list = [];
        this.idList = [];
        Util_1.default.trace("InsightFacadeImpl::init()");
    }
    addDataset(id, content, kind) {
        let that = this;
        let allPromise = [];
        return new Promise(function (resolve, reject) {
            let output = [];
            return that.checkValidDatasetId(id).then(function (validOrNot) {
                if (validOrNot && (that.existOrNot(that.list, id)) && that.checkNull(content, kind)) {
                    let zip1 = new JSZip();
                    zip1.loadAsync(content, { base64: true }).then(function (zip) {
                        zip.folder("courses").forEach(function (relativePath, file) {
                            allPromise.push(file.async("text"));
                        });
                        Util_1.default.trace("get after");
                        Promise.all(allPromise).then(function (result) {
                            output = that.readIntoSec(result);
                            Util_1.default.trace(output.length);
                            if (output.length !== 0) {
                                fs.writeFile("data/" + id + ".json", JSON.stringify(output), (err) => {
                                    if (err) {
                                        Util_1.default.trace("Reject savefile");
                                        return reject(new IInsightFacade_1.InsightError("Could not save file to disk"));
                                    }
                                });
                                Util_1.default.trace("after write");
                                let dds = { id: "", kind: IInsightFacade_1.InsightDatasetKind.Courses, numRows: 0 };
                                dds.id = id;
                                dds.kind = IInsightFacade_1.InsightDatasetKind.Courses;
                                dds.numRows = output.length;
                                that.list.push(dds);
                                that.idList.push(id);
                                Util_1.default.trace("before resolve： " + dds.numRows);
                                return resolve(that.idList);
                            }
                            else {
                                return reject(new IInsightFacade_1.InsightError());
                            }
                        }).catch((err) => {
                            return reject(new IInsightFacade_1.InsightError("wrong"));
                        });
                    }).catch((err) => {
                        return reject(new IInsightFacade_1.InsightError("no valid section"));
                    });
                }
                else {
                    Util_1.default.trace("id incorrect");
                    reject(new IInsightFacade_1.InsightError());
                }
            }).catch((err) => {
                return reject(new IInsightFacade_1.InsightError("no valid section"));
            });
        });
    }
    readIntoSec(AllFiles) {
        let output = [];
        Util_1.default.trace("start to read");
        for (let str of AllFiles) {
            let obj = JSON.parse(str);
            let Sections = this.convertValidFileToSectionObjects(obj);
            for (let sec of Sections) {
                output.push(sec);
            }
        }
        Util_1.default.trace(output.length);
        return output;
    }
    checkNull(con, k) {
        Util_1.default.trace(con);
        return (con !== null) && (con !== undefined) && (k !== null) && (k !== undefined) &&
            (k !== IInsightFacade_1.InsightDatasetKind.Rooms);
    }
    checkValidDatasetId(id) {
        let that = this;
        return new Promise(function (resolve, reject) {
            let matchNotAllSpaces = RegExp(/\S/g).test(id);
            let matchNoUnderscore = RegExp(/^[^_]*$/g).test(id);
            if ((id !== null) && (id !== undefined) && (matchNotAllSpaces) && (matchNoUnderscore) &&
                (id !== "")) {
                Util_1.default.trace("id correct");
                resolve(true);
            }
            else {
                resolve(false);
            }
        });
    }
    convertValidFileToSectionObjects(file) {
        let that = this;
        let sections = [];
        let numRows = 0;
        let potentialSectionsToAddObject = file["result"];
        let i = 0;
        for (let key in potentialSectionsToAddObject) {
            if (that.checkValidSection(potentialSectionsToAddObject[i])) {
                let tempSection = that.convert(potentialSectionsToAddObject[i]);
                sections.push(tempSection);
                numRows++;
            }
            i++;
        }
        return sections;
    }
    checkValidSection(section) {
        let keysToBeContained = { Subject: false, Course: false, Avg: false, Professor: false, Title: false, Pass: false, Fail: false, Audit: false, id: false, Year: false };
        Object.seal(keysToBeContained);
        let keys = Object.keys(section);
        keys.forEach(function (key) {
            if ((key === "Subject") || (key === "Course") || (key === "Avg") || (key === "Professor") ||
                (key === "Title") || (key === "Pass") || (key === "Fail") || (key === "Audit") ||
                (key === "id") || (key === "Year")) {
                keysToBeContained[key] = true;
            }
        });
        let numContained = 0;
        let keysToCheck = Object.keys(keysToBeContained);
        keysToCheck.forEach(function (key) {
            if (keysToBeContained[key] === true) {
                numContained++;
            }
        });
        if (numContained === 10) {
            return true;
        }
        else {
            return false;
        }
    }
    convert(couSec) {
        let sec = { dept: "", id: "", avg: 0, instructor: "", title: "", pass: 0,
            fail: 0, audit: 0, uuid: "", year: 0 };
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
        return sec;
    }
    existOrNot(input, givenId) {
        for (let isd of input) {
            if (isd.id === givenId) {
                return false;
            }
        }
        return true;
    }
    removeDataset(id) {
        let that = this;
        return new Promise(function (resolve, reject) {
            return that.checkValidDatasetId(id).then(function (valid) {
                if (valid && !(that.existOrNot(that.list, id))) {
                    fs.unlink("./data/" + id + ".json", (err) => {
                        if (err) {
                            return reject(err);
                        }
                    });
                    let i = 0;
                    for (let ds of that.list) {
                        if (that.list[i].id === id) {
                            that.list.splice(i, 1);
                            Util_1.default.trace(that.list.length);
                            break;
                        }
                        else {
                            i++;
                        }
                    }
                    return resolve(id);
                }
                else {
                    if (that.existOrNot(that.list, id)) {
                        return reject(new IInsightFacade_1.NotFoundError());
                    }
                    else {
                        return reject(new IInsightFacade_1.InsightError());
                    }
                }
            }).catch((err) => {
                return reject(new IInsightFacade_1.InsightError());
            });
        });
    }
    performQuery(query) {
        return new Promise(function (resolve, reject) {
            let qp = new QueryProcessor_1.default();
            qp.query(query).then(function (result) {
                resolve(result);
            }).catch(function (err) {
                reject(err);
            });
        });
    }
    listDatasets() {
        let that = this;
        return new Promise(function (resolve, reject) {
            return resolve(that.list);
        });
    }
}
exports.default = InsightFacade;
//# sourceMappingURL=InsightFacade.js.map