import { z } from "zod";

export const logRequestError = (
  message: string,
  error: unknown,
  payload: unknown,
) => {
  const body =
    payload !== null && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const donor =
    body.donor !== null && typeof body.donor === "object"
      ? (body.donor as Record<string, unknown>)
      : {};
  const context = Object.fromEntries(
    Object.entries({
      email: body.email ?? donor.email,
      id: body.id,
      order_id: body.order_id,
      type: body.type,
    }).filter(
      ([, value]) => typeof value === "string" || typeof value === "number",
    ),
  );

  return logError(
    Object.keys(context).length
      ? `${message} ${JSON.stringify(context)}`
      : message,
    error,
  );
};

export const logError = async (message: string, error?: unknown) => {
  if (error instanceof z.ZodError) {
    const reasons = error.issues
      .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
      .join("; ");
    message = `${message} Validation failed: ${reasons}`;
    error = undefined;
  }

  const stderrError = toLogError(error);

  console.error(message, ...(stderrError !== undefined ? [stderrError] : []));

  const url = process.env.NTFY_URL;
  if (!url) {
    return;
  }

  try {
    const environment =
      process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown";
    const detail = toNotificationError(error);
    const notification = [message, detail].filter(Boolean).join("\n\n");
    const bytes = Buffer.from(notification);
    const notificationMessage =
      bytes.length > 4000
        ? `${bytes.subarray(0, 3900).toString("utf8")}\n\n[truncated; see server logs]`
        : notification;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: "giveffektivt",
        title: `Giv Effektivt error (${environment})`,
        message: notificationMessage,
        tags: ["warning"],
      }),
      signal: AbortSignal.timeout(5000),
      redirect: "error",
    });

    if (!response.ok) {
      console.error(`ntfy notification failed (HTTP ${response.status})`);
    }
  } catch {
    console.error("ntfy notification failed (network error or timeout)");
  }
};

const toLogError = (error: unknown) => {
  if (!error) {
    return undefined;
  }

  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "string" || error instanceof String) {
    return { error: error.toString() };
  }

  return error;
};

const toNotificationError = (error: unknown) => {
  if (!error) {
    return undefined;
  }

  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  if (typeof error === "string" || error instanceof String) {
    return error.toString();
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};
