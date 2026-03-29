import { actions } from "astro:actions";
import type { Alpine } from "alpinejs";

type HabitCategory =
  | "health"
  | "learning"
  | "focus"
  | "fitness"
  | "finance"
  | "personal"
  | "custom";

type HabitItem = {
  id: string;
  title: string;
  category?: HabitCategory | null;
  frequencyType: "daily" | "weekly";
  targetPerPeriod: number;
  notes?: string;
  status: "active" | "archived";
  totalLogs: number;
  logsToday: number;
  lastCompletedAt: Date | null;
};

type HabitSummary = {
  totalHabits: number;
  activeHabits: number;
  archivedHabits: number;
  recentLogs: number;
  completionsToday: number;
};

type HabitTrackerStore = {
  habits: HabitItem[];
  summary: HabitSummary;
  activeTab: "overview" | "habits" | "archived";
  activeHabitDetail: HabitItem | null;
  modal: {
    create: boolean;
    edit: boolean;
    log: boolean;
  };
  loading: boolean;
  submitting: boolean;
  flash: { type: "success" | "error"; message: string } | null;
  bootstrap(payload: {
    habits: HabitItem[];
    summary: HabitSummary;
    tab?: "overview" | "habits" | "archived";
    activeHabitDetail?: HabitItem;
  }): void;
  setTab(tab: "overview" | "habits" | "archived"): void;
  refresh(includeArchived?: boolean): Promise<void>;
  setFlash(type: "success" | "error", message: string): void;
  createHabit(formData: FormData): Promise<void>;
  updateHabit(id: string, formData: FormData): Promise<void>;
  archiveHabit(id: string): Promise<void>;
  restoreHabit(id: string): Promise<void>;
  logHabitProgress(formData: FormData): Promise<void>;
  removeHabitLog(habitId: string, logId: string): Promise<void>;
};

function normalizeCategory(value: FormDataEntryValue | null): HabitCategory | undefined {
  const category = String(value ?? "").trim();
  if (!category) return undefined;

  switch (category) {
    case "health":
    case "learning":
    case "focus":
    case "fitness":
    case "finance":
    case "personal":
    case "custom":
      return category;
    default:
      return undefined;
  }
}

export default function initAlpine(Alpine: Alpine) {
  const store: HabitTrackerStore = {
    habits: [] as HabitItem[],
    summary: {
      totalHabits: 0,
      activeHabits: 0,
      archivedHabits: 0,
      recentLogs: 0,
      completionsToday: 0,
    },
    activeTab: "overview" as "overview" | "habits" | "archived",
    activeHabitDetail: null as HabitItem | null,
    modal: {
      create: false,
      edit: false,
      log: false,
    },
    loading: false,
    submitting: false,
    flash: null as { type: "success" | "error"; message: string } | null,

    bootstrap(payload: {
      habits: HabitItem[];
      summary: {
        totalHabits: number;
        activeHabits: number;
        archivedHabits: number;
        recentLogs: number;
        completionsToday: number;
      };
      tab?: "overview" | "habits" | "archived";
      activeHabitDetail?: HabitItem;
    }) {
      const state = Alpine.store("habitTracker") as HabitTrackerStore;
      state.habits = payload.habits;
      state.summary = payload.summary;
      state.activeTab = payload.tab ?? "overview";
      state.activeHabitDetail = payload.activeHabitDetail ?? null;
    },

    setTab(tab: "overview" | "habits" | "archived") {
      const state = Alpine.store("habitTracker") as HabitTrackerStore;
      state.activeTab = tab;
    },

    async refresh(includeArchived = true) {
      const state = Alpine.store("habitTracker") as HabitTrackerStore;
      state.loading = true;
      try {
        const response = await actions.listHabits({ includeArchived });
        if (response.error) throw new Error(response.error.message);
        state.habits = response.data.data.items as HabitItem[];
        state.summary = response.data.data.summary;
      } catch (error) {
        state.setFlash("error", error instanceof Error ? error.message : "Unable to refresh habits.");
      } finally {
        state.loading = false;
      }
    },

    setFlash(type: "success" | "error", message: string) {
      const state = Alpine.store("habitTracker") as HabitTrackerStore;
      state.flash = { type, message };
      setTimeout(() => {
        const currentState = Alpine.store("habitTracker") as HabitTrackerStore;
        currentState.flash = null;
      }, 3200);
    },

    async createHabit(formData: FormData) {
      const state = Alpine.store("habitTracker") as HabitTrackerStore;
      state.submitting = true;
      try {
        const payload = {
          title: String(formData.get("title") ?? ""),
          category: normalizeCategory(formData.get("category")),
          frequencyType: String(formData.get("frequencyType") || "daily") as "daily" | "weekly",
          targetPerPeriod: Number(formData.get("targetPerPeriod") || 1),
          notes: String(formData.get("notes") || "") || undefined,
        };
        const response = await actions.createHabit(payload);
        if (response.error) throw new Error(response.error.message);
        state.modal.create = false;
        await state.refresh(true);
        state.setFlash("success", "Habit created.");
      } catch (error) {
        state.setFlash("error", error instanceof Error ? error.message : "Unable to create habit.");
      } finally {
        state.submitting = false;
      }
    },

    async updateHabit(id: string, formData: FormData) {
      const state = Alpine.store("habitTracker") as HabitTrackerStore;
      state.submitting = true;
      try {
        const response = await actions.updateHabit({
          id,
          title: String(formData.get("title") ?? ""),
          category: normalizeCategory(formData.get("category")),
          frequencyType: String(formData.get("frequencyType") || "daily") as "daily" | "weekly",
          targetPerPeriod: Number(formData.get("targetPerPeriod") || 1),
          notes: String(formData.get("notes") || "") || undefined,
        });
        if (response.error) throw new Error(response.error.message);
        state.modal.edit = false;
        await state.refresh(true);
        state.setFlash("success", "Habit updated.");
      } catch (error) {
        state.setFlash("error", error instanceof Error ? error.message : "Unable to update habit.");
      } finally {
        state.submitting = false;
      }
    },

    async archiveHabit(id: string) {
      const state = Alpine.store("habitTracker") as HabitTrackerStore;
      try {
        const response = await actions.archiveHabit({ id });
        if (response.error) throw new Error(response.error.message);
        await state.refresh(true);
        state.setFlash("success", "Habit archived.");
      } catch (error) {
        state.setFlash("error", error instanceof Error ? error.message : "Unable to archive habit.");
      }
    },

    async restoreHabit(id: string) {
      const state = Alpine.store("habitTracker") as HabitTrackerStore;
      try {
        const response = await actions.restoreHabit({ id });
        if (response.error) throw new Error(response.error.message);
        await state.refresh(true);
        state.setFlash("success", "Habit restored.");
      } catch (error) {
        state.setFlash("error", error instanceof Error ? error.message : "Unable to restore habit.");
      }
    },

    async logHabitProgress(formData: FormData) {
      const state = Alpine.store("habitTracker") as HabitTrackerStore;
      state.submitting = true;
      try {
        const response = await actions.logHabitProgress({
          habitId: String(formData.get("habitId")),
          loggedDate: new Date(String(formData.get("loggedDate") || new Date().toISOString().slice(0, 10))),
          value: Number(formData.get("value") || 1),
          notes: String(formData.get("notes") || "") || undefined,
        });
        if (response.error) throw new Error(response.error.message);
        state.modal.log = false;
        state.setFlash("success", "Progress logged.");
        window.location.reload();
      } catch (error) {
        state.setFlash("error", error instanceof Error ? error.message : "Unable to log progress.");
      } finally {
        state.submitting = false;
      }
    },

    async removeHabitLog(habitId: string, logId: string) {
      const state = Alpine.store("habitTracker") as HabitTrackerStore;
      try {
        const response = await actions.removeHabitLog({ habitId, logId });
        if (response.error) throw new Error(response.error.message);
        state.setFlash("success", "Log removed.");
        window.location.reload();
      } catch (error) {
        state.setFlash("error", error instanceof Error ? error.message : "Unable to remove log.");
      }
    },
  };

  Alpine.store("habitTracker", store);
}
