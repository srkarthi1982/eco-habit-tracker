/**
 * Eco Habit Tracker - build and track eco-friendly habits.
 *
 * Design goals:
 * - Habits (e.g. "Use public transport", "Avoid plastic bottles").
 * - Logs for each habit with optional quantity.
 * - Optional impact-per-unit fields to estimate eco impact later.
 */

import { defineTable, column, NOW } from "astro:db";

export const EcoHabits = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),

    name: column.text(),                             // "Use reusable bottle"
    description: column.text({ optional: true }),
    category: column.text({ optional: true }),       // "transport", "energy", "waste", "water"
    frequency: column.text({ optional: true }),      // "daily", "weekly", "monthly"

    targetPerPeriod: column.number({ optional: true }), // e.g. 5 times per week

    // Optional impact hints
    impactPerUnit: column.number({ optional: true }),   // e.g. kg CO2 saved per unit
    impactUnit: column.text({ optional: true }),        // "kg_co2", "liters_water", etc.

    isActive: column.boolean({ default: true }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const EcoHabitLogs = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    habitId: column.text({
      references: () => EcoHabits.columns.id,
    }),
    userId: column.text(),

    logDate: column.date({ default: NOW }),          // date of action
    quantity: column.number({ optional: true }),     // how many times / units
    notes: column.text({ optional: true }),

    createdAt: column.date({ default: NOW }),
  },
});

export const tables = {
  EcoHabits,
  EcoHabitLogs,
} as const;
