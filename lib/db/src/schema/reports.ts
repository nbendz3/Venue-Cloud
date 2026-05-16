import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  reportName: text("report_name").notNull(),
  description: text("description"),
  reportType: text("report_type"),
  folder: text("folder"),
  owner: text("owner"),
  // Builder config stored as JSON
  selectedColumns: text("selected_columns"), // JSON: string[]
  groupings: text("groupings"),              // JSON: {column, sortOrder}[]
  sorts: text("sorts"),                      // JSON: {column, sortOrder}[]
  calculations: text("calculations"),        // JSON: {column, avg, sum, max, min}[]
  filters: text("filters"),                  // JSON: filter group structure
  dateType: text("date_type"),
  dateRange: text("date_range"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  hideDetailRows: boolean("hide_detail_rows").default(false),
  sqlQuery: text("sql_query"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertReportSchema = createInsertSchema(reportsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reportsTable.$inferSelect;

export const reportSchedulesTable = pgTable("report_schedules", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull(),
  frequency: text("frequency").notNull(), // Daily | Weekly | Monthly
  dayOfWeek: text("day_of_week"),
  dayOfMonth: integer("day_of_month"),
  runTime: text("run_time"),
  outputFormat: text("output_format").notNull().default("PDF"), // PDF | Excel | CSV
  recipients: text("recipients"), // comma-separated emails
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by"),
});

export const insertReportScheduleSchema = createInsertSchema(reportSchedulesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertReportSchedule = z.infer<typeof insertReportScheduleSchema>;
export type ReportSchedule = typeof reportSchedulesTable.$inferSelect;

export const reportJobResultsTable = pgTable("report_job_results", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id").notNull(),
  reportId: integer("report_id").notNull(),
  runAt: timestamp("run_at").defaultNow().notNull(),
  status: text("status").notNull().default("success"), // success | failed
  rowCount: integer("row_count"),
  outputPath: text("output_path"),
  errorMessage: text("error_message"),
});
export type ReportJobResult = typeof reportJobResultsTable.$inferSelect;
