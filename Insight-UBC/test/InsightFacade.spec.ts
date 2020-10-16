import { expect } from "chai";
import * as fs from "fs-extra";
import {InsightDataset, InsightDatasetKind, InsightError} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";
import QueryProcessor from "../src/controller/QueryProcessor";

// This should match the schema given to TestUtil.validate(..) in TestUtil.readTestQueries(..)
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any;  // make any to allow testing structurally invalid queries
    isQueryValid: boolean;
    result: any;
    filename: string;  // This is injected when reading the file
}

describe("InsightFacade Add/Remove Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the 'before' hook.
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        coursesWithInvalidFile: "./test/data/coursesWithInvalidFile.zip",
        coursesWOnlyInvalidFile: "./test/data/coursesWOnlyInvalidFile.zip",
        coursesEmpty: "./test/data/coursesEmpty.zip",
        rooms: "./test/data/rooms.zip"
    };
    let datasets: { [id: string]: string } = {};
    let insightFacade: InsightFacade;
    const cacheDir = __dirname + "/../data";

    before(function () {
        // This section runs once and loads all datasets specified in the datasetsToLoad object
        // into the datasets object
        Log.test(`Before all`);
        for (const id of Object.keys(datasetsToLoad)) {
            datasets[id] = fs.readFileSync(datasetsToLoad[id]).toString("base64");
        }
    });

    beforeEach(function () {
        // This section resets the data directory (removing any cached data) and resets the InsightFacade instance
        // This runs before each test, which should make each test independent from the previous one
        Log.test(`BeforeTest: ${this.currentTest.title}`);
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    it("name them files!", function () {
        fs.readdirSync("test/data").forEach((file) => {
            Log.trace(file);
        });
        let c = JSON.parse("{\n" +
            "   \"WHERE\":{\n" +
            "      \"GT\":{\n" +
            "         \"courses_avg\":97\n" +
            "      }\n" +
            "   },\n" +
            "   \"OPTIONS\":{\n" +
            "      \"COLUMNS\":[\n" +
            "         \"courses_dept\",\n" +
            "         \"courses_avg\"\n" +
            "      ],\n" +
            "      \"ORDER\":\"courses_avg\"\n" +
            "   }\n" +
            "}");
        Log.trace(c);
        let r = c["OPTIONS"]["COLUMNS"];
        let k = Object.keys(r);
        Log.trace(k);
    });

    it("checkValidDatasetID - empty string false", function () {
        return insightFacade.checkValidDatasetId("").then(function (result: boolean) {
            expect(result).to.deep.equal(false);
        });
    });

    it("checkValidDatasetID - all spaces false", function () {
        return insightFacade.checkValidDatasetId("   ").then(function (result: boolean) {
            expect(result).to.deep.equal(false);
        });
    });

    it("checkValidDatasetID - contains underscore false", function () {
        return insightFacade.checkValidDatasetId(" c c _ e").then(function (result: boolean) {
            expect(result).to.deep.equal(false);
        });
    });

    it("checkValidDatasetID - valid true", function () {
        return insightFacade.checkValidDatasetId("  y  c").then(function (result: boolean) {
            expect(result).to.deep.equal(true);
        });
    });

    it("structureValid (TRUE) - contains WHERE, OPTIONS", function () {
        let qp = new QueryProcessor();
        let ans = qp.structureValid(
            {
                WHERE: {
                    GT: {
                        courses_avg: 97
                    }
                },
                OPTIONS: {
                    COLUMNS: [
                        "courses_dept",
                        "courses_avg"
                    ],
                    ORDER: "courses_avg"
                }
            }
        );
        expect(ans).to.deep.equal(true);
    });

    it("structureValid (FALSE) - contains WHERE, OPTIONS, THIRD", function () {
        let qp = new QueryProcessor();
        let ans = qp.structureValid(
            {
                WHERE: {
                    GT: {
                        courses_avg: 97
                    }
                },
                OPTIONS: {
                    COLUMNS: [
                        "courses_dept",
                        "courses_avg"
                    ],
                    ORDER: "courses_avg"
                },
                THIRD: {}
            }
        );
        expect(ans).to.deep.equal(false);
    });

    it("structureValid (FALSE) - contains WHERE not options", function () {
        let qp = new QueryProcessor();
        let ans = qp.structureValid(
            {
                OPTIONS: {
                    COLUMNS: [
                        "courses_dept",
                        "courses_avg"
                    ],
                    ORDER: "courses_avg"
                }
            }
        );
        expect(ans).to.deep.equal(false);
    });

    it("structureValid (FALSE) - contains OPTIONS not where", function () {
        let qp = new QueryProcessor();
        let ans = qp.structureValid(
            {
                WHERE: {
                    GT: {
                        courses_avg: 97
                    }
                }
            }
        );
        expect(ans).to.deep.equal(false);
    });

    it("optionsValid (TRUE) - contains COLUMNS, ORDER", function () {
        let qp = new QueryProcessor();
        let que: any = {
            WHERE: {
                GT: {
                    courses_avg: 97
                }
            },
            OPTIONS: {
                COLUMNS: [
                    "courses_dept",
                    "courses_avg"
                ],
                ORDER: "courses_avg"
            }
        };
        let ans = qp.optionsValid(
            que["OPTIONS"]
        );
        expect(ans).to.deep.equal(true);
    });

    it("optionsValid (TRUE) - contains COLUMNS not ORDER", function () {
        let qp = new QueryProcessor();
        let que: any = {
            WHERE: {
                GT: {
                    courses_avg: 97
                }
            },
            OPTIONS: {
                COLUMNS: [
                    "courses_dept",
                    "courses_avg"
                ]
            }
        };
        let ans = qp.optionsValid(
            que["OPTIONS"]
        );
        expect(ans).to.deep.equal(true);
    });

    it("optionsValid (FALSE) - contains none of: COLUMNS, ORDER", function () {
        let qp = new QueryProcessor();
        let que: any = {
            WHERE: {
                GT: {
                    courses_avg: 97
                }
            },
            OPTIONS: {
            }
        };
        let ans = qp.optionsValid(
            que["OPTIONS"]
        );
        expect(ans).to.deep.equal(false);
    });

    it("optionsValid (FALSE) - contains ORDER not COLUMNS", function () {
        let qp = new QueryProcessor();
        let que: any = {
            WHERE: {
                GT: {
                    courses_avg: 97
                }
            },
            OPTIONS: {
                ORDER: "courses_avg"
            }
        };
        let ans = qp.optionsValid(
            que["OPTIONS"]
        );
        expect(ans).to.deep.equal(false);
    });

    it("columnsNotEmpty (TRUE) - contains COLUMNS contains 1 entry", function () {
        let qp = new QueryProcessor();
        let que: any = {
            WHERE: {
                GT: {
                    courses_avg: 97
                }
            },
            OPTIONS: {
                COLUMNS: [
                    "courses_dept"
                ]
            }
        };
        let ans = qp.columnsNotEmpty(
            que["OPTIONS"]["COLUMNS"]
        );
        expect(ans).to.deep.equal(true);
    });

    it("columnsNotEmpty (FALSE) - contains COLUMNS contains 0 entries", function () {
        let qp = new QueryProcessor();
        let que: any = {
            WHERE: {
                GT: {
                    courses_avg: 97
                }
            },
            OPTIONS: {
                COLUMNS: [
                ]
            }
        };
        let ans = qp.columnsNotEmpty(
            que["OPTIONS"]["COLUMNS"]
        );
        expect(ans).to.deep.equal(false);
        Log.trace(qp.printD());
        qp.changeD();
        Log.trace(qp.printD());
    });

    it("columnsRegEx (TRUE) - COLUMNS key all valid", function () {
        let qp = new QueryProcessor();
        let que: any = {
            WHERE: {
                GT: {
                    courses_avg: 97
                }
            },
            OPTIONS: {
                COLUMNS: [
                    "courses_dept",
                    "courses_fail",
                    "courses_pass"
                ]
            }
        };
        let ans = qp.keysRegEx(
            que["OPTIONS"]["COLUMNS"]
        );
        expect(ans).to.deep.equal(true);
    });

    it("columnsRegEx (FALSE) - COLUMNS invalid key; double underscore", function () {
        let qp = new QueryProcessor();
        let que: any = {
            WHERE: {
                GT: {
                    courses_avg: 97
                }
            },
            OPTIONS: {
                COLUMNS: [
                    "courses__dept",
                    "courses_fail",
                    "courses_pass"
                ]
            }
        };
        let ans = qp.keysRegEx(
            que["OPTIONS"]["COLUMNS"]
        );
        expect(ans).to.deep.equal(false);
    });

    it("columnsRegEx (FALSE) - COLUMNS invalid key; double underscore", function () {
        let qp = new QueryProcessor();
        let que: any = {
            WHERE: {
                GT: {
                    courses_avg: 97
                }
            },
            OPTIONS: {
                COLUMNS: [
                    "courses_dept",
                    "_courses_fail",
                    "courses_pass"
                ]
            }
        };
        let ans = qp.keysRegEx(
            que["OPTIONS"]["COLUMNS"]
        );
        expect(ans).to.deep.equal(false);
    });

    it("columnsRegEx (FALSE) - COLUMNS invalid key; underscore at end of line", function () {
        let qp = new QueryProcessor();
        let que: any = {
            WHERE: {
                GT: {
                    courses_avg: 97
                }
            },
            OPTIONS: {
                COLUMNS: [
                    "courses_dept",
                    "coursesfail_",
                    "courses_pass"
                ]
            }
        };
        let ans = qp.keysRegEx(
            que["OPTIONS"]["COLUMNS"]
        );
        expect(ans).to.deep.equal(false);
    });

    it("columnsRegEx (FALSE) - COLUMNS invalid key; underscore at start of line", function () {
        let qp = new QueryProcessor();
        let que: any = {
            WHERE: {
                GT: {
                    courses_avg: 97
                }
            },
            OPTIONS: {
                COLUMNS: [
                    "courses_dept",
                    "_coursesfail",
                    "courses_pass"
                ]
            }
        };
        let ans = qp.keysRegEx(
            que["OPTIONS"]["COLUMNS"]
        );
        expect(ans).to.deep.equal(false);
    });

    it("getDatasetName - courses, only key", function () {
        let qp = new QueryProcessor();
        let que: any = {
            WHERE: {
                GT: {
                    courses_avg: 97
                }
            },
            OPTIONS: {
                COLUMNS: [
                    "courses_dept"
                ]
            }
        };
        let ans = qp.getDatasetName(
            que["OPTIONS"]["COLUMNS"]
        );
        Log.trace(ans);
        expect(ans).to.deep.equal("courses");
    });

    it("getDatasetName - rooms, multiple keys", function () {
        let qp = new QueryProcessor();
        let que: any = {
            WHERE: {
                GT: {
                    courses_avg: 97
                }
            },
            OPTIONS: {
                COLUMNS: [
                    "rooms_dept",
                    "courses_dept"
                ]
            }
        };
        let ans = qp.getDatasetName(
            que["OPTIONS"]["COLUMNS"]
        );
        Log.trace(ans);
        expect(ans).to.deep.equal("rooms");
    });

    it("allKeyReferenceSameDataset - courses, only dataset referenced", function () {
        let qp = new QueryProcessor();
        let que: any = {
            WHERE: {
                GT: {
                    courses_avg: 97
                }
            },
            OPTIONS: {
                COLUMNS: [
                    "courses_dept"
                ]
            }
        };
        let ans = qp.getDatasetName(
            que["OPTIONS"]["COLUMNS"]
        );
        Log.trace(ans);
        expect(qp.allKeyReference(que["OPTIONS"]["COLUMNS"])).to.deep.equal(true);
    });

    it("allKeyReferenceSameDataset - multiple dataset referenced", function () {
        let qp = new QueryProcessor();
        let que: any = {
            WHERE: {
                GT: {
                    courses_avg: 97
                }
            },
            OPTIONS: {
                COLUMNS: [
                    "rooms_dept",
                    "courses_dept"
                ]
            }
        };
        let ans = qp.getDatasetName(
            que["OPTIONS"]["COLUMNS"]
        );
        Log.trace(ans);
        expect(qp.allKeyReference(que["OPTIONS"]["COLUMNS"])).to.deep.equal(false);
    });

    it("allValidKeyCalls [TRUE]", function () {
        let qp = new QueryProcessor();
        let que: any = {
            WHERE: {
                GT: {
                    courses_avg: 97
                }
            },
            OPTIONS: {
                COLUMNS: [
                    "rooms_dept",
                    "courses_id",
                    "courses_uuid",
                    "courses_instructor",
                    "courses_pass",
                    "courses_fail",
                    "courses_year",
                    "courses_title",
                    "courses_audit",
                    "courses_avg",
                    "rooms_dept",
                    "rooms_year"
                ]
            }
        };
        expect(qp.allValidKeyCalls(que["OPTIONS"]["COLUMNS"])).to.deep.equal(true);
    });

    it("allValidKeyCalls [FALSE]", function () {
        let qp = new QueryProcessor();
        let que: any = {
            WHERE: {
                GT: {
                    courses_avg: 97
                }
            },
            OPTIONS: {
                COLUMNS: [
                    "rooms_dept",
                    "courses_id",
                    "courses_uuid",
                    "courses_instructors",
                    "courses_pass",
                    "courses_fail",
                    "courses_year",
                    "courses_title",
                    "courses_audit",
                    "courses_avg",
                    "rooms_dept",
                    "rooms_year"
                ]
            }
        };
        expect(qp.allValidKeyCalls(que["OPTIONS"]["COLUMNS"])).to.deep.equal(false);
    });
    // This is a unit test. You should create more like this!
//     it("Should add a valid dataset", function () {
//         const id: string = "courses";
//         const expected: string[] = [id];
//         return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
//             // Log.info("foo: " + JSON.stringify(result));
//             // expect(result[0]).to.equal("courses");
//             // Log.info("bar");
//            expect(result).to.deep.equal(expected);
//         }).catch((err: any) => {
//             Log.info("baz");
//             expect.fail(err, expected, "Should not have rejected");
//         });
//
//     });
//
//     it("Should add a valid dataset - invalid entry w/ valid entry", function () {
//         const id: string = "coursesValid";
//         const expected: string[] = [id];
//         return insightFacade.addDataset(id, datasets["courses"], InsightDatasetKind.Courses).
//         then((result: string[]) => {
//             expect(result).to.deep.equal(expected);
//         }).catch((err: any) => {
//             expect.fail(err, expected, "Should not have rejected");
//         });
//
//     });
//
//     it("Should not add invalid dataset - no valid entries", function () {
//         const id: string = "coursesEmpty";
//         return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
//             expect.fail(result, [], "Should not have fulfilled");
//         }).catch((err: any) => {
//             expect(err).to.be.instanceOf(InsightError);
//         });
//
//     });
//
//     it("Should not add invalid dataset - only file is invalid", function () {
//         const id: string = "onlyFileInvalid";
//         return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
//             expect.fail(result, [], "Should not have fulfilled");
//         }).catch((err: any) => {
//             expect(err).to.be.instanceOf(InsightError);
//         });
//
//     });
//
//     it("Should have dataset courses added (listDataset test)", function () {
//         const id: string = "courses";
//         const expectedAdd: string[] = [id];
//         const set: InsightDataset = { id: "courses", kind: InsightDatasetKind.Courses, numRows: 64612};
//         const expectedDataset: InsightDataset[] = [set];
//         return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).
//         then((resultofAdd: string[]) => {
//             expect(resultofAdd).to.deep.equal(expectedAdd);
//             return insightFacade.listDatasets().then((resultofDataset: InsightDataset[]) => {
//                 expect(resultofDataset).to.deep.equal(expectedDataset);
//             }).catch((err: any) => {
//                 expect.fail(err, expectedDataset, "Should not have rejected promise");
//             });
//         }).catch((err: any) => {
//             expect.fail(err, expectedAdd, "Should not have rejected test add");
//         });
//     });
//
//     it("Remove dataset courses", function () {
//         const id: string = "courses";
//         const expectedAdd: string[] = [id];
//         return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).
//         then((resultofAdd: string[]) => {
//             expect(resultofAdd).to.deep.equal(expectedAdd);
//             return insightFacade.removeDataset("courses").then((resultofRemove: string) => {
//                 expect(resultofRemove).to.deep.equal("courses");
//                 const expectedDatasetAfterRemove: InsightDataset[] = [];
//                 const datasetAfterRemove = insightFacade.listDatasets().then((resultofDataset: InsightDataset[]) => {
//                     expect(resultofDataset).to.deep.equal(expectedDatasetAfterRemove);
//                 }).catch((err: any) => {
//                     expect.fail(err, expectedDatasetAfterRemove, "Should not have rejected promise");
//                 });
//                 expect(datasetAfterRemove).to.deep.equal(expectedDatasetAfterRemove);
//             }).catch((err: any) => {
//                 expect.fail(err, [], "Should not have rejected promise");
//             });
//         }).catch((err: any) => {
//             expect.fail(err, expectedAdd, "Should not have rejected test add");
//         });
//     });
//     it("Should add when database is non-empty", function () {
//         const id: string = "courses";
//         const id2: string = "departments";
//         const expected: string[] = [id, id2];
//         return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result0: string[]) => {
//             return insightFacade.addDataset(id2, datasets[id], InsightDatasetKind.Courses).
//             then((result: string[]) => {
//                 return insightFacade.listDatasets();
//             }).then((result1: any) => {
//                 expect(result1).to.have.lengthOf(2);
//             });
//         }).catch((err: any) => {
//             expect.fail(err, expected, "Should not have rejected");
//         });
//     });
//
//     it("Should not add using Rooms", function () {
//         const id: string = "courses";
//         return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms).then((result: string[]) => {
//             return insightFacade.listDatasets();
//         }).then((result: any) => {
//             expect(result).to.have.lengthOf(0);
//         }).catch((err: InsightError) => {
//             expect(err).to.be.instanceOf(InsightError);
//         });
//
//     });
//
//     // it("Should add dataset with valid id - 2 items in set", function () {
//     //     const id: string = "courses";
//     //     const expectedAdd: string[] = [id];
//     //     const expected2ndAdd: string[] = [id, " hippos "];
//     //     const set: InsightDataset = { id: "courses", kind: InsightDatasetKind.Courses, numRows: 64612 };
//     //     const set2: InsightDataset = { id: " hippo ", kind: InsightDatasetKind.Courses, numRows: 64612};
//     //     const expectedDataset: InsightDataset[] = [set, set2];
//     //     return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).
//     //     then((resultofAdd: string[]) => {
//     //         expect(resultofAdd).to.deep.equal(expectedAdd);
//     //         return insightFacade.addDataset(" hippo ", datasets[id],
//     //             InsightDatasetKind.Courses).then(
//     //             (resultOf2ndAdd: string[]) => {
//     //                 expect(resultOf2ndAdd).to.deep.equal(expected2ndAdd);
//     //                 return insightFacade.listDatasets().then((datasetsListed: InsightDataset[]) => {
//     //                     expect(datasetsListed).to.deep.equal(expectedDataset);
//     //                 }).catch((error: any) => {
//     //                     expect.fail(error, expectedDataset, "Should not have rejected promise");
//     //                 });
//     //             }).catch((err: any) => {
//     //             expect.fail(err, expected2ndAdd, "Should not have rejected promise");
//     //         });
//     //     }).catch((err: any) => {
//     //         expect.fail(err, expectedAdd, "Should not have rejected test add");
//     //     });
//     // });
//
//     it("Should not add dataset with invalid id empty string", function () {
//         const id: string = "";
//         return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
//             expect.fail(result, [], "Should not have fulfilled");
//         }).catch((err: any) => {
//             expect(err).to.be.instanceOf(InsightError);
//         });
//
//     });
//
//     it("Should not add dataset with same ID as one that already exists", function () {
//         const id: string = "courses";
//         const expectedAdd: string[] = [id];
//         const set: InsightDataset = { id: "courses", kind: InsightDatasetKind.Courses, numRows: 64612};
//         const expectedDataset: InsightDataset[] = [set];
//         return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).
//         then((resultofAdd: string[]) => {
//             expect(resultofAdd).to.deep.equal(expectedAdd);
//             return insightFacade.addDataset(id, datasets["coursesWithInvalidFile"], InsightDatasetKind.Courses).then(
//                 (resultOfDuplicateAdd: string[]) => {
//                     expect.fail(resultOfDuplicateAdd, expectedAdd, "Should not have fulfilled promise");
//                 }).catch((err: any) => {
//                 return insightFacade.listDatasets().then((datasetsListed: InsightDataset[]) => {
//                     expect(datasetsListed).to.deep.equal(expectedDataset);
//                 }).catch((error: any) => {
//                     expect.fail(error, expectedDataset, "Should not have rejected promise");
//                 });
//             });
//         }).catch((err: any) => {
//             expect.fail(err, expectedAdd, "Should not have rejected test add");
//         });
//     });
//
//     it("Should not add dataset with invalid id - underscore", function () {
//         const id: string = "courses";
//         const expectedAdd: string[] = [id];
//         const set: InsightDataset = { id: "courses", kind: InsightDatasetKind.Courses, numRows: 64612};
//         const expectedDataset: InsightDataset[] = [set];
//         return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).
//         then((resultofAdd: string[]) => {
//             expect(resultofAdd).to.deep.equal(expectedAdd);
//             return insightFacade.addDataset("cour_ses", datasets["coursesWithInvalidFile"],
//                 InsightDatasetKind.Courses).then(
//                 (resultOfRejectedAdd: string[]) => {
//                     expect.fail(resultOfRejectedAdd, expectedAdd, "Should not have fulfilled promise");
//                 }).catch((err: any) => {
//                 return insightFacade.listDatasets().then((datasetsListed: InsightDataset[]) => {
//                     expect(datasetsListed).to.deep.equal(expectedDataset);
//                 }).catch((error: any) => {
//                     expect.fail(error, expectedDataset, "Should not have rejected promise");
//                 });
//             });
//         }).catch((err: any) => {
//             expect.fail(err, expectedAdd, "Should not have rejected test add");
//         });
//     });
//
//     it("Should not add dataset with invalid id - whitespace only characters", function () {
//         const id: string = "courses";
//         const expectedAdd: string[] = [id];
//         const set: InsightDataset = { id: "courses", kind: InsightDatasetKind.Courses, numRows: 64612};
//         const expectedDataset: InsightDataset[] = [set];
//         return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).
//         then((resultofAdd: string[]) => {
//             expect(resultofAdd).to.deep.equal(expectedAdd);
//             return insightFacade.addDataset("   ", datasets["coursesWithInvalidFile"],
//                 InsightDatasetKind.Courses).then(
//                 (resultOfRejectedAdd: string[]) => {
//                     expect.fail(resultOfRejectedAdd, expectedAdd, "Should not have fulfilled promise");
//                 }).catch((err: any) => {
//                 return insightFacade.listDatasets().then((datasetsListed: InsightDataset[]) => {
//                     expect(datasetsListed).to.deep.equal(expectedDataset);
//                 }).catch((error: any) => {
//                     expect.fail(error, expectedDataset, "Should not have rejected promise");
//                 });
//             });
//         }).catch((err: any) => {
//             expect.fail(err, expectedAdd, "Should not have rejected test add");
//         });
//     });
//
//     it("Should add a valid dataset", function () {
//         const id: string = "rooms";
//         // const expected: string[] = ["courses", id];
//         return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms).then((result: string[]) => {
//             expect.fail(result, [], "Should not add RoomKind");
//         }).catch((err: any) => {
//             expect(err).to.be.instanceOf(InsightError);
//         });
//     });
//     it("Should remove a dataset with valid id", function () {
//         const id: string = "allValidFiles";
//         // insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//         return insightFacade.addDataset(id, datasets["courses"], InsightDatasetKind.Courses).
//         then((result: string []) => {
//             Log.trace("added");
//             return insightFacade.removeDataset(id).then((result2: string) => {
//                 return insightFacade.listDatasets();
//             }).then((result1: any) => {
//                 Log.trace("remove");
//                 Log.trace(result1.length);
//                 expect(result1).to.have.lengthOf(0);
//             });
//         }).catch((err: any) => {
//             expect.fail(err, "Should not have rejected");
//         });
//
//     });
//
//     it("Should not remove a dataset that has not been added", function () {
//         const id: string = "courses";
//         const expectedAdd: string[] = [id];
//         return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).
//         then((resultofAdd: string[]) => {
//             expect(resultofAdd).to.deep.equal(expectedAdd);
//             return insightFacade.removeDataset(" hippos ").then((resultofRemove: string) => {
//                 expect.fail(resultofRemove, InsightError, "Should not have removed dataset");
//             }).catch((err: any) => {
//                 expect(err).to.be.instanceOf(InsightError);
//             });
//         }).catch((err: any) => {
//             expect.fail(err, expectedAdd, "Should not have rejected test add");
//         });
//     });
//
//     it("Should not remove a dataset with invalid id - contains underscore", function () {
//         const id: string = "courses";
//         const expectedAdd: string[] = [id];
//         return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).
//         then((resultofAdd: string[]) => {
//             expect(resultofAdd).to.deep.equal(expectedAdd);
//             return insightFacade.removeDataset(" __ ").then((resultofRemove: string) => {
//                 expect.fail(resultofRemove, InsightError, "Should not have removed dataset");
//             }).catch((err: any) => {
//                 expect(err).to.be.instanceOf(InsightError);
//             });
//         }).catch((err: any) => {
//             expect.fail(err, expectedAdd, "Should not have rejected test add");
//         });
//     });
//
//     it("Should not remove a dataset with invalid id - only whitespace characters", function () {
//         const id: string = "courses";
//         const expectedAdd: string[] = [id];
//         return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).
//         then((resultofAdd: string[]) => {
//             expect(resultofAdd).to.deep.equal(expectedAdd);
//             return insightFacade.removeDataset(" ").then((resultofRemove: string) => {
//                 expect.fail(resultofRemove, InsightError, "Should not have removed dataset");
//             }).catch((err: any) => {
//                 expect(err).to.be.instanceOf(InsightError);
//             });
//         }).catch((err: any) => {
//             expect.fail(err, expectedAdd, "Should not have rejected test add");
//         });
//     });
});

/*
 * This test suite dynamically generates tests from the JSON files in test/queries.
 * You should not need to modify it; instead, add additional files to the queries directory.
 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
 */
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: { [id: string]: any } = {
        courses: {id: "courses", path: "./test/data/courses.zip", kind: InsightDatasetKind.Courses},
    };
    let insightFacade: InsightFacade;
    let testQueries: ITestQuery[] = [];

    // Load all the test queries, and call addDataset on the insightFacade instance for all the datasets
    before(function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = TestUtil.readTestQueries();
        } catch (err) {
            expect.fail("", "", `Failed to read one or more test queries. ${err}`);
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Will fail* if there is a problem reading ANY dataset.
        const loadDatasetPromises: Array<Promise<string[]>> = [];
        insightFacade = new InsightFacade();
        for (const key of Object.keys(datasetsToQuery)) {
            const ds = datasetsToQuery[key];
            const data = fs.readFileSync(ds.path).toString("base64");
            loadDatasetPromises.push(insightFacade.addDataset(ds.id, data, ds.kind));
        }
        return Promise.all(loadDatasetPromises).catch((err) => {
            /* *IMPORTANT NOTE: This catch is to let this run even without the implemented addDataset,
             * for the purposes of seeing all your tests run.
             * For D1, remove this catch block (but keep the Promise.all)
             */
            return Promise.resolve("HACK TO LET QUERIES RUN");
        });
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Dynamically create and run a test for each query in testQueries
    // Creates an extra "test" called "Should run test queries" as a byproduct. Don't worry about it
    it("Should run test queries", function () {
        describe("Dynamic InsightFacade PerformQuery tests", function () {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, function (done) {
                    insightFacade.performQuery(test.query).then((result) => {
                        TestUtil.checkQueryResult(test, result, done);
                    }).catch((err) => {
                        TestUtil.checkQueryResult(test, err, done);
                    });
                });
            }
        });
    });
    it("IS uuid", function () {
        let query = {
            WHERE: {
                IS: {
                    courses_uuid: 5373
                }
            },
            OPTIONS: {
                COLUMNS: [
                    "courses_avg",
                    "courses_uuid"
                ]
            }
        };
        let expected = [{courses_avg: 99.78, courses_uuid: 5373}];
        return insightFacade.performQuery(query).then((result: any[]) => {
            expect(result).to.be.deep.equal(expected);
        }).catch((err: any) => {
            Log.trace(err);
            expect.fail(err, expected, "fail");
        });
    });
});
