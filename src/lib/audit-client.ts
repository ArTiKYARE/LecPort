export async function logClient(action: string, details?: string) {
  try {
    await fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, details }),
    });
  } catch {
    // аудит не должен ломать UX
  }
}
