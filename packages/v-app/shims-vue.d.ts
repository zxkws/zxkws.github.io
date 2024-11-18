declare module "vue" {
  export interface GlobalComponents {
    STable: typeof import("@surely-vue/table")["STable"];
    STableColumn: typeof import("@surely-vue/table")["STableColumn"];
    STableColumnGroup: typeof import("@surely-vue/table")["STableColumnGroup"];
    STableSummary: typeof import("@surely-vue/table")["STableSummary"];
    STableSummaryRow: typeof import("@surely-vue/table")["STableSummaryRow"];
    STableSummaryCell: typeof import("@surely-vue/table")["STableSummaryCell"];
  }
}
export {};
