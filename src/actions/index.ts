import type { ActionAPIContext } from "astro:actions";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { EcoHabitLogs, EcoHabits, and, db, eq } from "astro:db";

function requireUser(context: ActionAPIContext) {
  const locals = context.locals as App.Locals | { user?: { id: string } } | undefined;
  const user = locals?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return user;
}

async function getHabitForUser(habitId: string, userId: string) {
  const [habit] = await db
    .select()
    .from(EcoHabits)
    .where(and(eq(EcoHabits.id, habitId), eq(EcoHabits.userId, userId)));

  return habit ?? null;
}

const habitFieldsSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  frequency: z.string().optional(),
  targetPerPeriod: z.number().positive().optional(),
  impactPerUnit: z.number().optional(),
  impactUnit: z.string().optional(),
});

export const server = {
  createHabit: defineAction({
    input: habitFieldsSchema,
    handler: async (input, context) => {
      const user = requireUser(context);
      const habitId = crypto.randomUUID();
      const timestamp = new Date();

      await db.insert(EcoHabits).values({
        id: habitId,
        userId: user.id,
        ...input,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      return {
        success: true,
        data: { habitId },
      };
    },
  }),

  updateHabit: defineAction({
    input: habitFieldsSchema
      .partial()
      .extend({ id: z.string() })
      .refine(
        (payload) =>
          [
            payload.name,
            payload.description,
            payload.category,
            payload.frequency,
            payload.targetPerPeriod,
            payload.impactPerUnit,
            payload.impactUnit,
          ].some((value) => value !== undefined),
        { message: "At least one field must be provided to update." },
      ),
    handler: async (input, context) => {
      const user = requireUser(context);
      const habit = await getHabitForUser(input.id, user.id);

      if (!habit) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Habit not found.",
        });
      }

      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.category !== undefined) updates.category = input.category;
      if (input.frequency !== undefined) updates.frequency = input.frequency;
      if (input.targetPerPeriod !== undefined) updates.targetPerPeriod = input.targetPerPeriod;
      if (input.impactPerUnit !== undefined) updates.impactPerUnit = input.impactPerUnit;
      if (input.impactUnit !== undefined) updates.impactUnit = input.impactUnit;

      await db
        .update(EcoHabits)
        .set(updates)
        .where(and(eq(EcoHabits.id, input.id), eq(EcoHabits.userId, user.id)));

      return {
        success: true,
        data: { habitId: input.id },
      };
    },
  }),

  archiveHabit: defineAction({
    input: z.object({ id: z.string() }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const habit = await getHabitForUser(input.id, user.id);

      if (!habit) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Habit not found.",
        });
      }

      await db
        .update(EcoHabits)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(EcoHabits.id, input.id), eq(EcoHabits.userId, user.id)));

      return {
        success: true,
        data: { habitId: input.id },
      };
    },
  }),

  listMyHabits: defineAction({
    input: z.object({ includeInactive: z.boolean().default(false) }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const whereClause = input.includeInactive
        ? eq(EcoHabits.userId, user.id)
        : and(eq(EcoHabits.userId, user.id), eq(EcoHabits.isActive, true));

      const habits = await db.select().from(EcoHabits).where(whereClause);

      return {
        success: true,
        data: {
          items: habits,
          total: habits.length,
        },
      };
    },
  }),

  upsertHabitLog: defineAction({
    input: z.object({
      id: z.string().optional(),
      habitId: z.string(),
      logDate: z.coerce.date().optional(),
      quantity: z.number().nonnegative().optional(),
      notes: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const habit = await getHabitForUser(input.habitId, user.id);

      if (!habit) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Habit not found.",
        });
      }

      if (input.id) {
        const [existingLog] = await db
          .select()
          .from(EcoHabitLogs)
          .where(and(eq(EcoHabitLogs.id, input.id), eq(EcoHabitLogs.userId, user.id)));

        if (!existingLog) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Habit log not found.",
          });
        }

        await db
          .update(EcoHabitLogs)
          .set({
            habitId: input.habitId,
            logDate: input.logDate ?? existingLog.logDate,
            quantity: input.quantity,
            notes: input.notes,
          })
          .where(and(eq(EcoHabitLogs.id, input.id), eq(EcoHabitLogs.userId, user.id)));

        return {
          success: true,
          data: { logId: input.id, mode: "updated" as const },
        };
      }

      const logId = crypto.randomUUID();

      await db.insert(EcoHabitLogs).values({
        id: logId,
        habitId: input.habitId,
        userId: user.id,
        logDate: input.logDate ?? new Date(),
        quantity: input.quantity,
        notes: input.notes,
        createdAt: new Date(),
      });

      return {
        success: true,
        data: { logId, mode: "created" as const },
      };
    },
  }),

  listHabitLogs: defineAction({
    input: z.object({ habitId: z.string().optional() }).default({}),
    handler: async (input, context) => {
      const user = requireUser(context);
      const habitId = input.habitId;

      if (habitId) {
        const habit = await getHabitForUser(habitId, user.id);

        if (!habit) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Habit not found.",
          });
        }
      }

      const whereClause = habitId
        ? and(eq(EcoHabitLogs.userId, user.id), eq(EcoHabitLogs.habitId, habitId))
        : eq(EcoHabitLogs.userId, user.id);

      const logs = await db.select().from(EcoHabitLogs).where(whereClause);

      return {
        success: true,
        data: {
          items: logs,
          total: logs.length,
        },
      };
    },
  }),
};
