import type { ActionAPIContext } from "astro:actions";
import { ActionError, defineAction } from "astro:actions";
import { HabitLogs, Habits, and, db, eq } from "astro:db";
import { z } from "astro:schema";
import { pushDashboardSummary, pushNotification } from "../lib/integrations";

const habitCategorySchema = z
  .enum(["health", "learning", "focus", "fitness", "finance", "personal", "custom"])
  .optional();

const frequencySchema = z.enum(["daily", "weekly"]);

const habitStatusSchema = z.enum(["active", "archived"]);

const habitBaseSchema = z.object({
  title: z.string().trim().min(1).max(120),
  category: habitCategorySchema,
  frequencyType: frequencySchema.default("daily"),
  targetPerPeriod: z.number().int().min(1).max(50).default(1),
  notes: z.string().trim().max(1200).optional(),
});

function requireUser(context: ActionAPIContext) {
  const user = context.locals.user;
  if (!user?.id) {
    throw new ActionError({ code: "UNAUTHORIZED", message: "Sign in required." });
  }
  return user;
}

async function getHabitOwnedByUser(habitId: string, userId: string) {
  const [habit] = await db.select().from(Habits).where(and(eq(Habits.id, habitId), eq(Habits.userId, userId)));
  return habit ?? null;
}

async function getUserHabits(userId: string) {
  return db.select().from(Habits).where(eq(Habits.userId, userId));
}

async function getLogsForHabit(habitId: string) {
  const logs = await db.select().from(HabitLogs).where(eq(HabitLogs.habitId, habitId));
  return logs.sort((a, b) => Number(new Date(b.loggedDate)) - Number(new Date(a.loggedDate)));
}

function dateOnly(input?: Date | string) {
  const date = input ? new Date(input) : new Date();
  const normalized = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return normalized;
}

async function publishSummaryForUser(userId: string) {
  const habits = await getUserHabits(userId);
  const logsByHabit = await Promise.all(habits.map((habit) => getLogsForHabit(habit.id)));
  const logs = logsByHabit.flat();
  const todayIso = dateOnly().toISOString().slice(0, 10);
  const logsToday = logs.filter((log) => new Date(log.loggedDate).toISOString().slice(0, 10) === todayIso).length;

  const latestLog = logs
    .slice()
    .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))[0];

  let latestHabitTitle: string | undefined;
  if (latestLog) {
    const latestHabit = habits.find((habit) => habit.id === latestLog.habitId);
    latestHabitTitle = latestHabit?.title;
  }

  await pushDashboardSummary({
    userId,
    appId: "habit-tracker",
    summary: {
      totalHabits: habits.length,
      activeHabits: habits.filter((habit) => habit.status === "active").length,
      archivedHabits: habits.filter((habit) => habit.status === "archived").length,
      logsToday,
      recentLogs: logs.filter((log) => Number(new Date(log.createdAt)) >= Date.now() - 1000 * 60 * 60 * 24 * 7).length,
      latestHabitTitle,
    },
  });
}

export async function listHabitsForUser(userId: string, includeArchived = true) {
  const habits = await getUserHabits(userId);
  const scopedHabits = includeArchived ? habits : habits.filter((habit) => habit.status === "active");

  const logEntries = await Promise.all(
    scopedHabits.map(async (habit) => {
      const logs = await getLogsForHabit(habit.id);
      return [habit.id, logs] as const;
    }),
  );

  const logsByHabit = new Map(logEntries);
  const todayIso = dateOnly().toISOString().slice(0, 10);

  const items = scopedHabits
    .slice()
    .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
    .map((habit) => {
      const logs = logsByHabit.get(habit.id) ?? [];
      return {
        ...habit,
        totalLogs: logs.length,
        logsToday: logs.filter((log) => new Date(log.loggedDate).toISOString().slice(0, 10) === todayIso).length,
        lastCompletedAt: logs[0]?.loggedDate ?? null,
      };
    });

  const allLogs = logEntries.flatMap((entry) => entry[1]);

  return {
    items,
    summary: {
      totalHabits: items.length,
      activeHabits: items.filter((habit) => habit.status === "active").length,
      archivedHabits: items.filter((habit) => habit.status === "archived").length,
      recentLogs: allLogs.filter((log) => Number(new Date(log.createdAt)) >= Date.now() - 1000 * 60 * 60 * 24 * 7).length,
      completionsToday: allLogs.filter(
        (log) => new Date(log.loggedDate).toISOString().slice(0, 10) === todayIso,
      ).length,
    },
  };
}

export async function getHabitDetailForUser(userId: string, habitId: string) {
  const habit = await getHabitOwnedByUser(habitId, userId);
  if (!habit) return null;

  const logs = await getLogsForHabit(habitId);
  const recentLogs = logs.slice(0, 20);

  return {
    habit,
    logs: recentLogs,
    metrics: {
      totalLogs: logs.length,
      lastCompletedDate: logs[0]?.loggedDate ?? null,
      recentStreak: (() => {
        let streak = 0;
        let cursor = dateOnly();
        const logSet = new Set(logs.map((log) => new Date(log.loggedDate).toISOString().slice(0, 10)));
        while (logSet.has(cursor.toISOString().slice(0, 10))) {
          streak += 1;
          cursor = new Date(cursor.getTime() - 1000 * 60 * 60 * 24);
        }
        return streak;
      })(),
    },
  };
}

export const server = {
  createHabit: defineAction({
    input: habitBaseSchema,
    handler: async (input, context) => {
      const user = requireUser(context);
      const now = new Date();
      const habitId = crypto.randomUUID();

      await db.insert(Habits).values({
        id: habitId,
        userId: user.id,
        title: input.title,
        category: input.category,
        frequencyType: input.frequencyType,
        targetPerPeriod: input.targetPerPeriod,
        notes: input.notes,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });

      await pushNotification({
        userId: user.id,
        appId: "habit-tracker",
        level: "success",
        title: "Habit created",
        message: `\"${input.title}\" is ready for check-ins.`,
      });

      await publishSummaryForUser(user.id);

      return { success: true, data: { id: habitId } };
    },
  }),

  updateHabit: defineAction({
    input: habitBaseSchema.partial().extend({ id: z.string(), status: habitStatusSchema.optional() }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const habit = await getHabitOwnedByUser(input.id, user.id);

      if (!habit) {
        throw new ActionError({ code: "NOT_FOUND", message: "Habit not found." });
      }

      const updates: Partial<typeof habit> = { updatedAt: new Date() };
      if (input.title !== undefined) updates.title = input.title;
      if (input.category !== undefined) updates.category = input.category;
      if (input.frequencyType !== undefined) updates.frequencyType = input.frequencyType;
      if (input.targetPerPeriod !== undefined) updates.targetPerPeriod = input.targetPerPeriod;
      if (input.notes !== undefined) updates.notes = input.notes;
      if (input.status !== undefined) updates.status = input.status;

      await db.update(Habits).set(updates).where(and(eq(Habits.id, input.id), eq(Habits.userId, user.id)));
      await publishSummaryForUser(user.id);

      return { success: true, data: { id: input.id } };
    },
  }),

  archiveHabit: defineAction({
    input: z.object({ id: z.string() }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const habit = await getHabitOwnedByUser(input.id, user.id);

      if (!habit) {
        throw new ActionError({ code: "NOT_FOUND", message: "Habit not found." });
      }

      await db
        .update(Habits)
        .set({ status: "archived", archivedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(Habits.id, input.id), eq(Habits.userId, user.id)));

      await publishSummaryForUser(user.id);
      return { success: true, data: { id: input.id } };
    },
  }),

  restoreHabit: defineAction({
    input: z.object({ id: z.string() }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const habit = await getHabitOwnedByUser(input.id, user.id);

      if (!habit) {
        throw new ActionError({ code: "NOT_FOUND", message: "Habit not found." });
      }

      await db
        .update(Habits)
        .set({ status: "active", archivedAt: null, updatedAt: new Date() })
        .where(and(eq(Habits.id, input.id), eq(Habits.userId, user.id)));

      await publishSummaryForUser(user.id);
      return { success: true, data: { id: input.id } };
    },
  }),

  logHabitProgress: defineAction({
    input: z.object({
      habitId: z.string(),
      loggedDate: z.coerce.date().optional(),
      value: z.number().int().min(1).max(100).default(1),
      notes: z.string().trim().max(400).optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const habit = await getHabitOwnedByUser(input.habitId, user.id);

      if (!habit) {
        throw new ActionError({ code: "NOT_FOUND", message: "Habit not found." });
      }

      const normalizedDate = dateOnly(input.loggedDate);
      const [existingLog] = await db
        .select()
        .from(HabitLogs)
        .where(and(eq(HabitLogs.habitId, input.habitId), eq(HabitLogs.loggedDate, normalizedDate)));

      if (existingLog) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "A log already exists for this habit on that date.",
        });
      }

      const existingCount = (await getLogsForHabit(input.habitId)).length;

      const logId = crypto.randomUUID();
      await db.insert(HabitLogs).values({
        id: logId,
        habitId: input.habitId,
        loggedDate: normalizedDate,
        value: input.value,
        notes: input.notes,
        createdAt: new Date(),
      });

      if (existingCount === 0) {
        await pushNotification({
          userId: user.id,
          appId: "habit-tracker",
          level: "success",
          title: "First completion logged",
          message: `Great start on \"${habit.title}\".`,
        });
      }

      if (existingCount + 1 === 10) {
        await pushNotification({
          userId: user.id,
          appId: "habit-tracker",
          level: "info",
          title: "Milestone reached",
          message: `You recorded 10 completions for \"${habit.title}\".`,
        });
      }

      await publishSummaryForUser(user.id);

      return { success: true, data: { id: logId } };
    },
  }),

  removeHabitLog: defineAction({
    input: z.object({ logId: z.string(), habitId: z.string() }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const habit = await getHabitOwnedByUser(input.habitId, user.id);
      if (!habit) {
        throw new ActionError({ code: "NOT_FOUND", message: "Habit not found." });
      }

      const [log] = await db
        .select()
        .from(HabitLogs)
        .where(and(eq(HabitLogs.id, input.logId), eq(HabitLogs.habitId, input.habitId)));

      if (!log) {
        throw new ActionError({ code: "NOT_FOUND", message: "Log not found." });
      }

      await db.delete(HabitLogs).where(and(eq(HabitLogs.id, input.logId), eq(HabitLogs.habitId, input.habitId)));
      await publishSummaryForUser(user.id);

      return { success: true, data: { id: input.logId } };
    },
  }),

  listHabits: defineAction({
    input: z.object({ includeArchived: z.boolean().default(true) }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const data = await listHabitsForUser(user.id, input.includeArchived);
      return { success: true, data };
    },
  }),

  getHabitDetail: defineAction({
    input: z.object({ habitId: z.string() }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const detail = await getHabitDetailForUser(user.id, input.habitId);
      if (!detail) {
        throw new ActionError({ code: "NOT_FOUND", message: "Habit not found." });
      }
      return { success: true, data: detail };
    },
  }),
};
