import { actions } from "astro:actions";
import type { Alpine } from "alpinejs";

type HabitItem = {
  id: string;
  title: string;
  category?: string;
  frequencyType: "daily" | "weekly";
  targetPerPeriod: number;
  notes?: string;
  status: "active" | "archived";
  totalLogs: number;
  logsToday: number;
  lastCompletedAt: Date | null;
};

export default function initAlpine(Alpine: Alpine) {
  Alpine.store("habitTracker", {
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
      this.habits = payload.habits;
      this.summary = payload.summary;
      this.activeTab = payload.tab ?? "overview";
      this.activeHabitDetail = payload.activeHabitDetail ?? null;
    },

    setTab(tab: "overview" | "habits" | "archived") {
      this.activeTab = tab;
    },

    async refresh(includeArchived = true) {
      this.loading = true;
      try {
        const response = await actions.listHabits({ includeArchived });
        if (response.error) throw new Error(response.error.message);
        this.habits = response.data.items as HabitItem[];
        this.summary = response.data.summary;
      } catch (error) {
        this.setFlash("error", error instanceof Error ? error.message : "Unable to refresh habits.");
      } finally {
        this.loading = false;
      }
    },

    setFlash(type: "success" | "error", message: string) {
      this.flash = { type, message };
      setTimeout(() => {
        this.flash = null;
      }, 3200);
    },

    async createHabit(formData: FormData) {
      this.submitting = true;
      try {
        const payload = {
          title: String(formData.get("title") ?? ""),
          category: (String(formData.get("category") || "") || undefined) as HabitItem["category"],
          frequencyType: String(formData.get("frequencyType") || "daily") as "daily" | "weekly",
          targetPerPeriod: Number(formData.get("targetPerPeriod") || 1),
          notes: String(formData.get("notes") || "") || undefined,
        };
        const response = await actions.createHabit(payload);
        if (response.error) throw new Error(response.error.message);
        this.modal.create = false;
        await this.refresh(true);
        this.setFlash("success", "Habit created.");
      } catch (error) {
        this.setFlash("error", error instanceof Error ? error.message : "Unable to create habit.");
      } finally {
        this.submitting = false;
      }
    },

    async updateHabit(id: string, formData: FormData) {
      this.submitting = true;
      try {
        const response = await actions.updateHabit({
          id,
          title: String(formData.get("title") ?? ""),
          category: (String(formData.get("category") || "") || undefined) as HabitItem["category"],
          frequencyType: String(formData.get("frequencyType") || "daily") as "daily" | "weekly",
          targetPerPeriod: Number(formData.get("targetPerPeriod") || 1),
          notes: String(formData.get("notes") || "") || undefined,
        });
        if (response.error) throw new Error(response.error.message);
        this.modal.edit = false;
        await this.refresh(true);
        this.setFlash("success", "Habit updated.");
      } catch (error) {
        this.setFlash("error", error instanceof Error ? error.message : "Unable to update habit.");
      } finally {
        this.submitting = false;
      }
    },

    async archiveHabit(id: string) {
      try {
        const response = await actions.archiveHabit({ id });
        if (response.error) throw new Error(response.error.message);
        await this.refresh(true);
        this.setFlash("success", "Habit archived.");
      } catch (error) {
        this.setFlash("error", error instanceof Error ? error.message : "Unable to archive habit.");
      }
    },

    async restoreHabit(id: string) {
      try {
        const response = await actions.restoreHabit({ id });
        if (response.error) throw new Error(response.error.message);
        await this.refresh(true);
        this.setFlash("success", "Habit restored.");
      } catch (error) {
        this.setFlash("error", error instanceof Error ? error.message : "Unable to restore habit.");
      }
    },

    async logHabitProgress(formData: FormData) {
      this.submitting = true;
      try {
        const response = await actions.logHabitProgress({
          habitId: String(formData.get("habitId")),
          loggedDate: String(formData.get("loggedDate") || new Date().toISOString().slice(0, 10)),
          value: Number(formData.get("value") || 1),
          notes: String(formData.get("notes") || "") || undefined,
        });
        if (response.error) throw new Error(response.error.message);
        this.modal.log = false;
        this.setFlash("success", "Progress logged.");
        window.location.reload();
      } catch (error) {
        this.setFlash("error", error instanceof Error ? error.message : "Unable to log progress.");
      } finally {
        this.submitting = false;
      }
    },

    async removeHabitLog(habitId: string, logId: string) {
      try {
        const response = await actions.removeHabitLog({ habitId, logId });
        if (response.error) throw new Error(response.error.message);
        this.setFlash("success", "Log removed.");
        window.location.reload();
      } catch (error) {
        this.setFlash("error", error instanceof Error ? error.message : "Unable to remove log.");
      }
    },
  });
}
