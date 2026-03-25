type DashboardSummary = {
  userId: string;
  appId: "habit-tracker";
  summary: {
    totalHabits: number;
    activeHabits: number;
    archivedHabits: number;
    logsToday: number;
    recentLogs: number;
    latestHabitTitle?: string;
  };
};

type NotificationPayload = {
  userId: string;
  appId: "habit-tracker";
  level: "info" | "success";
  title: string;
  message: string;
};

const dashboardWebhook = import.meta.env.ANSIVERSA_DASHBOARD_WEBHOOK_URL;
const notificationsWebhook = import.meta.env.ANSIVERSA_NOTIFICATIONS_WEBHOOK_URL;

async function postJson(url: string | undefined, payload: unknown) {
  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // non-blocking integration path
  }
}

export async function pushDashboardSummary(payload: DashboardSummary) {
  await postJson(dashboardWebhook, payload);
}

export async function pushNotification(payload: NotificationPayload) {
  await postJson(notificationsWebhook, payload);
}
