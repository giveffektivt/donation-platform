import Rollbar from "rollbar";

const rollbar = new Rollbar({
  accessToken: process.env.ROLLBAR_SERVER_TOKEN,
  captureUncaught: true,
  captureUnhandledRejections: false,
  environment: process.env.VERCEL_ENV,
  captureIp: false,
  transform: (payload: any) => {
    payload.custom = undefined;
  },
});

export const logError = (message: string, error?: unknown) => {
  const err = toError(error);
  console.error(message, ...(err !== undefined ? [err] : []));
  rollbar.error(message, ...(err !== undefined ? [err] : []));
};

const toError = (error: unknown) => {
  if (!error) {
    return undefined;
  }

  if (error instanceof Error) {
    return { error: error.message };
  }

  if (typeof error === "string" || error instanceof String) {
    return { error: error.toString() };
  }

  try {
    return { error: JSON.stringify(error) };
  } catch {
    return { error: String(error) };
  }
};
