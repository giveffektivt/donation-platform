import Rollbar from "rollbar";

const rollbar = new Rollbar({
  accessToken: process.env.ROLLBAR_SERVER_TOKEN,
  captureUncaught: false,
  captureUnhandledRejections: false,
  environment: process.env.VERCEL_ENV,
  captureIp: false,
});

export const logError = (message: string, error?: unknown) => {
  const strippedError = toRollbarError(error);
  const stderrError = toLogError(error);

  console.error(message, ...(stderrError !== undefined ? [stderrError] : []));
  rollbar.error(
    message,
    ...(strippedError !== undefined ? [strippedError] : []),
  );
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

const toRollbarError = (error: unknown) => {
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
