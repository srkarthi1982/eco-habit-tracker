import { NOW, column, defineTable } from "astro:db";

export const Habits = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),
    title: column.text(),
    category: column.text({ optional: true }),
    frequencyType: column.text({ default: "daily" }),
    targetPerPeriod: column.number({ default: 1 }),
    notes: column.text({ optional: true }),
    status: column.text({ default: "active" }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
    archivedAt: column.date({ optional: true }),
  },
  indexes: [
    { on: ["userId", "status"] },
    { on: ["userId", "createdAt"] },
  ],
});

export const HabitLogs = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    habitId: column.text({ references: () => Habits.columns.id }),
    loggedDate: column.date(),
    value: column.number({ default: 1 }),
    notes: column.text({ optional: true }),
    createdAt: column.date({ default: NOW }),
  },
  indexes: [
    { on: ["habitId", "loggedDate"], unique: true },
    { on: ["habitId", "createdAt"] },
  ],
});

export const tables = { Habits, HabitLogs };
