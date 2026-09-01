import {
  buildFiltersFromRows,
  CATEGORY_FILTER,
  findDepartmentValuesInFilters,
  isDepartmentFieldName,
  LOCATION_FILTER,
  matchSheetRole,
  resolveCapitalPlanSheetMap,
  resolveEntryRestore,
  selectionParametersForRole,
  sheetNameFromLink,
} from "./tableauFilters";
import { CAPITAL_PLAN_WORKBOOK } from "../portalConfig";

const rows = [
  { category: "Athletics", location_type: "High School", location: "North HS", expense_amount: 100 },
  { category: "Athletics", location_type: "High School", location: "South HS", expense_amount: 900 },
  { category: "Athletics", location_type: "Stadium", location: "Memorial Field", expense_amount: 50 },
  { category: "Technology", location_type: "District Wide", location: "All Sites", expense_amount: 5000 },
];

const valuesFor = (filters, fieldName) =>
  filters.find((filter) => filter.fieldName === fieldName).values;

describe("buildFiltersFromRows", () => {
  it("orders categories by total expense descending", () => {
    const filters = buildFiltersFromRows(rows, {});
    expect(valuesFor(filters, CATEGORY_FILTER)).toEqual(["Technology", "Athletics"]);
  });

  it("cascades location types from the selected category", () => {
    const filters = buildFiltersFromRows(rows, { [CATEGORY_FILTER]: "Athletics" });
    expect(valuesFor(filters, "Location Type")).toEqual(["High School", "Stadium"]);
  });

  it("cascades locations from the selected location type", () => {
    const filters = buildFiltersFromRows(rows, {
      [CATEGORY_FILTER]: "Athletics",
      "Location Type": "High School",
    });
    expect(valuesFor(filters, LOCATION_FILTER)).toEqual(["South HS", "North HS"]);
  });

  it("reports the applied selection so the viz and the UI agree", () => {
    const filters = buildFiltersFromRows(rows, { [CATEGORY_FILTER]: "Technology" });
    const category = filters.find((f) => f.fieldName === CATEGORY_FILTER);
    expect(category.appliedValues).toEqual(["Technology"]);
    expect(category.isAllSelected).toBe(false);
  });

  it("ignores blank categories and locations instead of emitting empty options", () => {
    const filters = buildFiltersFromRows(
      [...rows, { category: "  ", location_type: "", location: "", expense_amount: 1 }],
      {}
    );
    expect(valuesFor(filters, CATEGORY_FILTER)).not.toContain("");
  });

  it("tolerates a missing or non-array row set", () => {
    expect(() => buildFiltersFromRows(undefined, {})).not.toThrow();
    expect(valuesFor(buildFiltersFromRows(null, {}), CATEGORY_FILTER)).toEqual([]);
  });
});

describe("department field detection", () => {
  it("accepts the known aliases and department-ish captions", () => {
    expect(isDepartmentFieldName("Category")).toBe(true);
    expect(isDepartmentFieldName("[Department]")).toBe(true);
    expect(isDepartmentFieldName("Departments")).toBe(true);
  });

  it("never treats the top-bar filters as departments", () => {
    expect(isDepartmentFieldName("Location Type")).toBe(false);
    expect(isDepartmentFieldName("LOCATION")).toBe(false);
  });

  it("drops Tableau's aggregate placeholders from the sidebar list", () => {
    const values = findDepartmentValuesInFilters([
      { fieldName: "Category", values: ["(All)", "All Departments", "Athletics", ""] },
    ]);
    expect(values).toEqual(["Athletics"]);
  });
});

describe("sheet mapping", () => {
  it("derives a role from the sheet link", () => {
    expect(matchSheetRole("wb/sheets/CapitalPlanOverview")).toBe("overview");
    expect(matchSheetRole("wb/sheets/CapitalPlanDetail")).toBe("detail");
    expect(matchSheetRole("wb/sheets/Forecast")).toBe("forecast");
    expect(matchSheetRole("wb/sheets/FinancingPlan")).toBe("financing");
    expect(matchSheetRole("wb/sheets/Unrelated")).toBeNull();
  });

  it("reads the sheet name off the end of a link", () => {
    expect(sheetNameFromLink("wb/sheets/CapitalPlanDetail")).toBe("CapitalPlanDetail");
    expect(sheetNameFromLink("")).toBe("");
  });

  it("maps roles from the capital-plan workbook only", () => {
    const map = resolveCapitalPlanSheetMap([
      [
        "1",
        {
          name: "Some Other Workbook",
          dashboards: ["other/sheets/CapitalPlanOverview"],
          dashboard_ids: ["x"],
        },
      ],
      [
        "2",
        {
          name: CAPITAL_PLAN_WORKBOOK,
          dashboards: [
            "wb/sheets/CapitalPlanOverview",
            "wb/sheets/CapitalPlanDetail",
          ],
          dashboard_ids: ["a", "b"],
        },
      ],
    ]);

    expect(map.overview.link).toBe("wb/sheets/CapitalPlanOverview");
    expect(map.detail.id).toBe("b");
    expect(map.forecast).toBeNull();
  });

  it("returns an empty map when the workbook is absent", () => {
    expect(resolveCapitalPlanSheetMap([])).toEqual({
      overview: null,
      detail: null,
      forecast: null,
      financing: null,
    });
  });
});

describe("resolveEntryRestore", () => {
  const base = {
    portalView: "capital-plan",
    embedContent: "dashboard",
    detailLink: "wb/sheets/CapitalPlanDetail",
  };

  it("declares every filter present in the entry URL, department first", () => {
    const restore = resolveEntryRestore({
      ...base,
      selections: {
        [CATEGORY_FILTER]: "Athletics",
        [LOCATION_FILTER]: "North HS",
        "Location Type": "High School",
      },
    });

    expect(restore.department).toBe("Athletics");
    expect(restore.topFilters).toEqual({
      "Location Type": "High School",
      [LOCATION_FILTER]: "North HS",
    });
    expect(restore.declarative).toEqual([
      { field: CATEGORY_FILTER, value: "Athletics" },
      { field: "Location Type", value: "High School" },
      { field: LOCATION_FILTER, value: "North HS" },
    ]);
  });

  it("restores a location-only URL with no department", () => {
    const restore = resolveEntryRestore({
      ...base,
      selections: { "Location Type": "Stadium" },
    });

    expect(restore.department).toBeNull();
    expect(restore.declarative).toEqual([
      { field: "Location Type", value: "Stadium" },
    ]);
  });

  it("leaves comma-bearing values to the API pass", () => {
    const restore = resolveEntryRestore({
      ...base,
      selections: {
        [CATEGORY_FILTER]: "Health, Safety & Security",
        "Location Type": "Stadium",
      },
    });

    expect(restore.department).toBe("Health, Safety & Security");
    expect(restore.declarative).toEqual([
      { field: "Location Type", value: "Stadium" },
    ]);
  });

  it("skips restoring when nothing would change", () => {
    expect(resolveEntryRestore({ ...base, selections: {} })).toBeNull();
    expect(resolveEntryRestore({ ...base })).toBeNull();
  });

  it("skips restoring outside the capital-plan dashboard", () => {
    const selections = { [CATEGORY_FILTER]: "Athletics" };
    expect(
      resolveEntryRestore({ ...base, selections, portalView: "admin" })
    ).toBeNull();
    expect(
      resolveEntryRestore({ ...base, selections, embedContent: "timeline" })
    ).toBeNull();
  });

  it("skips restoring when the workbook has no Detail sheet", () => {
    expect(
      resolveEntryRestore({
        ...base,
        detailLink: undefined,
        selections: { [CATEGORY_FILTER]: "Athletics" },
      })
    ).toBeNull();
  });
});

describe("selectionParametersForRole", () => {
  it("passes all flags as False outside Departments", () => {
    expect(selectionParametersForRole("overview")).toEqual([
      { name: "Department Selected", value: "False" },
      { name: "Category Selected", value: "False" },
      { name: "Location Selected", value: "False" },
    ]);
    expect(selectionParametersForRole("forecast")).toEqual(
      selectionParametersForRole("overview")
    );
    expect(selectionParametersForRole("financing")).toEqual(
      selectionParametersForRole("overview")
    );
  });

  it("passes department flags as True on the Departments sheet", () => {
    expect(selectionParametersForRole("detail")).toEqual([
      { name: "Department Selected", value: "True" },
      { name: "Category Selected", value: "True" },
      { name: "Location Selected", value: "False" },
    ]);
  });

  it("passes Location Selected as True only when a location is applied", () => {
    expect(
      selectionParametersForRole("detail", { locationSelected: true })
    ).toEqual([
      { name: "Department Selected", value: "True" },
      { name: "Category Selected", value: "True" },
      { name: "Location Selected", value: "True" },
    ]);
    expect(
      selectionParametersForRole("overview", { locationSelected: true })
    ).toEqual(selectionParametersForRole("overview"));
  });
});
