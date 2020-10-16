"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const fs = require("fs-extra");
const IInsightFacade_1 = require("../src/controller/IInsightFacade");
const InsightFacade_1 = require("../src/controller/InsightFacade");
const Util_1 = require("../src/Util");
const TestUtil_1 = require("./TestUtil");
const QueryProcessor_1 = require("../src/controller/QueryProcessor");
describe("InsightFacade Add/Remove Dataset", function () {
    const datasetsToLoad = {
        courses: "./test/data/courses.zip",
        coursesWithInvalidFile: "./test/data/coursesWithInvalidFile.zip",
        coursesWOnlyInvalidFile: "./test/data/coursesWOnlyInvalidFile.zip",
        coursesEmpty: "./test/data/coursesEmpty.zip",
        rooms: "./test/data/rooms.zip"
    };
    let datasets = {};
    let insightFacade;
    const cacheDir = __dirname + "/../data";
    before(function () {
        Util_1.default.test(`Before all`);
        for (const id of Object.keys(datasetsToLoad)) {
            datasets[id] = fs.readFileSync(datasetsToLoad[id]).toString("base64");
        }
    });
    beforeEach(function () {
        Util_1.default.test(`BeforeTest: ${this.currentTest.title}`);
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
            insightFacade = new InsightFacade_1.default();
        }
        catch (err) {
            Util_1.default.error(err);
        }
    });
    after(function () {
        Util_1.default.test(`After: ${this.test.parent.title}`);
    });
    afterEach(function () {
        Util_1.default.test(`AfterTest: ${this.currentTest.title}`);
    });
    it("name them files!", function () {
        fs.readdirSync("test/data").forEach((file) => {
            Util_1.default.trace(file);
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
        Util_1.default.trace(c);
        let r = c["OPTIONS"]["COLUMNS"];
        let k = Object.keys(r);
        Util_1.default.trace(k);
    });
    it("checkValidDatasetID - empty string false", function () {
        return insightFacade.checkValidDatasetId("").then(function (result) {
            chai_1.expect(result).to.deep.equal(false);
        });
    });
    it("checkValidDatasetID - all spaces false", function () {
        return insightFacade.checkValidDatasetId("   ").then(function (result) {
            chai_1.expect(result).to.deep.equal(false);
        });
    });
    it("checkValidDatasetID - contains underscore false", function () {
        return insightFacade.checkValidDatasetId(" c c _ e").then(function (result) {
            chai_1.expect(result).to.deep.equal(false);
        });
    });
    it("checkValidDatasetID - valid true", function () {
        return insightFacade.checkValidDatasetId("  y  c").then(function (result) {
            chai_1.expect(result).to.deep.equal(true);
        });
    });
    it("structureValid (TRUE) - contains WHERE, OPTIONS", function () {
        let qp = new QueryProcessor_1.default();
        let ans = qp.structureValid({
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
        });
        chai_1.expect(ans).to.deep.equal(true);
    });
    it("structureValid (FALSE) - contains WHERE, OPTIONS, THIRD", function () {
        let qp = new QueryProcessor_1.default();
        let ans = qp.structureValid({
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
        });
        chai_1.expect(ans).to.deep.equal(false);
    });
    it("structureValid (FALSE) - contains WHERE not options", function () {
        let qp = new QueryProcessor_1.default();
        let ans = qp.structureValid({
            OPTIONS: {
                COLUMNS: [
                    "courses_dept",
                    "courses_avg"
                ],
                ORDER: "courses_avg"
            }
        });
        chai_1.expect(ans).to.deep.equal(false);
    });
    it("structureValid (FALSE) - contains OPTIONS not where", function () {
        let qp = new QueryProcessor_1.default();
        let ans = qp.structureValid({
            WHERE: {
                GT: {
                    courses_avg: 97
                }
            }
        });
        chai_1.expect(ans).to.deep.equal(false);
    });
    it("optionsValid (TRUE) - contains COLUMNS, ORDER", function () {
        let qp = new QueryProcessor_1.default();
        let que = {
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
        let ans = qp.optionsValid(que["OPTIONS"]);
        chai_1.expect(ans).to.deep.equal(true);
    });
    it("optionsValid (TRUE) - contains COLUMNS not ORDER", function () {
        let qp = new QueryProcessor_1.default();
        let que = {
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
        let ans = qp.optionsValid(que["OPTIONS"]);
        chai_1.expect(ans).to.deep.equal(true);
    });
    it("optionsValid (FALSE) - contains none of: COLUMNS, ORDER", function () {
        let qp = new QueryProcessor_1.default();
        let que = {
            WHERE: {
                GT: {
                    courses_avg: 97
                }
            },
            OPTIONS: {}
        };
        let ans = qp.optionsValid(que["OPTIONS"]);
        chai_1.expect(ans).to.deep.equal(false);
    });
    it("optionsValid (FALSE) - contains ORDER not COLUMNS", function () {
        let qp = new QueryProcessor_1.default();
        let que = {
            WHERE: {
                GT: {
                    courses_avg: 97
                }
            },
            OPTIONS: {
                ORDER: "courses_avg"
            }
        };
        let ans = qp.optionsValid(que["OPTIONS"]);
        chai_1.expect(ans).to.deep.equal(false);
    });
    it("columnsNotEmpty (TRUE) - contains COLUMNS contains 1 entry", function () {
        let qp = new QueryProcessor_1.default();
        let que = {
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
        let ans = qp.columnsNotEmpty(que["OPTIONS"]["COLUMNS"]);
        chai_1.expect(ans).to.deep.equal(true);
    });
    it("columnsNotEmpty (FALSE) - contains COLUMNS contains 0 entries", function () {
        let qp = new QueryProcessor_1.default();
        let que = {
            WHERE: {
                GT: {
                    courses_avg: 97
                }
            },
            OPTIONS: {
                COLUMNS: []
            }
        };
        let ans = qp.columnsNotEmpty(que["OPTIONS"]["COLUMNS"]);
        chai_1.expect(ans).to.deep.equal(false);
        Util_1.default.trace(qp.printD());
        qp.changeD();
        Util_1.default.trace(qp.printD());
    });
    it("columnsRegEx (TRUE) - COLUMNS key all valid", function () {
        let qp = new QueryProcessor_1.default();
        let que = {
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
        let ans = qp.keysRegEx(que["OPTIONS"]["COLUMNS"]);
        chai_1.expect(ans).to.deep.equal(true);
    });
    it("columnsRegEx (FALSE) - COLUMNS invalid key; double underscore", function () {
        let qp = new QueryProcessor_1.default();
        let que = {
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
        let ans = qp.keysRegEx(que["OPTIONS"]["COLUMNS"]);
        chai_1.expect(ans).to.deep.equal(false);
    });
    it("columnsRegEx (FALSE) - COLUMNS invalid key; double underscore", function () {
        let qp = new QueryProcessor_1.default();
        let que = {
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
        let ans = qp.keysRegEx(que["OPTIONS"]["COLUMNS"]);
        chai_1.expect(ans).to.deep.equal(false);
    });
    it("columnsRegEx (FALSE) - COLUMNS invalid key; underscore at end of line", function () {
        let qp = new QueryProcessor_1.default();
        let que = {
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
        let ans = qp.keysRegEx(que["OPTIONS"]["COLUMNS"]);
        chai_1.expect(ans).to.deep.equal(false);
    });
    it("columnsRegEx (FALSE) - COLUMNS invalid key; underscore at start of line", function () {
        let qp = new QueryProcessor_1.default();
        let que = {
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
        let ans = qp.keysRegEx(que["OPTIONS"]["COLUMNS"]);
        chai_1.expect(ans).to.deep.equal(false);
    });
    it("getDatasetName - courses, only key", function () {
        let qp = new QueryProcessor_1.default();
        let que = {
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
        let ans = qp.getDatasetName(que["OPTIONS"]["COLUMNS"]);
        Util_1.default.trace(ans);
        chai_1.expect(ans).to.deep.equal("courses");
    });
    it("getDatasetName - rooms, multiple keys", function () {
        let qp = new QueryProcessor_1.default();
        let que = {
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
        let ans = qp.getDatasetName(que["OPTIONS"]["COLUMNS"]);
        Util_1.default.trace(ans);
        chai_1.expect(ans).to.deep.equal("rooms");
    });
    it("allKeyReferenceSameDataset - courses, only dataset referenced", function () {
        let qp = new QueryProcessor_1.default();
        let que = {
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
        let ans = qp.getDatasetName(que["OPTIONS"]["COLUMNS"]);
        Util_1.default.trace(ans);
        chai_1.expect(qp.allKeyReference(que["OPTIONS"]["COLUMNS"])).to.deep.equal(true);
    });
    it("allKeyReferenceSameDataset - multiple dataset referenced", function () {
        let qp = new QueryProcessor_1.default();
        let que = {
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
        let ans = qp.getDatasetName(que["OPTIONS"]["COLUMNS"]);
        Util_1.default.trace(ans);
        chai_1.expect(qp.allKeyReference(que["OPTIONS"]["COLUMNS"])).to.deep.equal(false);
    });
    it("allValidKeyCalls [TRUE]", function () {
        let qp = new QueryProcessor_1.default();
        let que = {
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
        chai_1.expect(qp.allValidKeyCalls(que["OPTIONS"]["COLUMNS"])).to.deep.equal(true);
    });
    it("allValidKeyCalls [FALSE]", function () {
        let qp = new QueryProcessor_1.default();
        let que = {
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
        chai_1.expect(qp.allValidKeyCalls(que["OPTIONS"]["COLUMNS"])).to.deep.equal(false);
    });
});
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery = {
        courses: { id: "courses", path: "./test/data/courses.zip", kind: IInsightFacade_1.InsightDatasetKind.Courses },
    };
    let insightFacade;
    let testQueries = [];
    before(function () {
        Util_1.default.test(`Before: ${this.test.parent.title}`);
        try {
            testQueries = TestUtil_1.default.readTestQueries();
        }
        catch (err) {
            chai_1.expect.fail("", "", `Failed to read one or more test queries. ${err}`);
        }
        const loadDatasetPromises = [];
        insightFacade = new InsightFacade_1.default();
        for (const key of Object.keys(datasetsToQuery)) {
            const ds = datasetsToQuery[key];
            const data = fs.readFileSync(ds.path).toString("base64");
            loadDatasetPromises.push(insightFacade.addDataset(ds.id, data, ds.kind));
        }
        return Promise.all(loadDatasetPromises).catch((err) => {
            return Promise.resolve("HACK TO LET QUERIES RUN");
        });
    });
    beforeEach(function () {
        Util_1.default.test(`BeforeTest: ${this.currentTest.title}`);
    });
    after(function () {
        Util_1.default.test(`After: ${this.test.parent.title}`);
    });
    afterEach(function () {
        Util_1.default.test(`AfterTest: ${this.currentTest.title}`);
    });
    it("Should run test queries", function () {
        describe("Dynamic InsightFacade PerformQuery tests", function () {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, function (done) {
                    insightFacade.performQuery(test.query).then((result) => {
                        TestUtil_1.default.checkQueryResult(test, result, done);
                    }).catch((err) => {
                        TestUtil_1.default.checkQueryResult(test, err, done);
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
        let expected = [{ courses_avg: 99.78, courses_uuid: 5373 }];
        return insightFacade.performQuery(query).then((result) => {
            chai_1.expect(result).to.be.deep.equal(expected);
        }).catch((err) => {
            Util_1.default.trace(err);
            chai_1.expect.fail(err, expected, "fail");
        });
    });
});
//# sourceMappingURL=InsightFacade.spec.js.map