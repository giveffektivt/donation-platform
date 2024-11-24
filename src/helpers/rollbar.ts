import Rollbar from "rollbar";

const rollbar = new Rollbar({
  accessToken: process.env.ROLLBAR_SERVER_TOKEN,
  captureUncaught: true,
  captureUnhandledRejections: true,
  environment: process.env.NODE_ENV,
  captureIp: false,
});

export const logError = (message: string, error?: unknown) => {
  const err = toError(error);
  console.error(message, err);
  rollbar.error(message, err);
};

const toError = (error: unknown) => {
  if (!error) {
    return undefined;
  }

  if (error instanceof Error) {
    return error;
  }

  try {
    return new Error(JSON.stringify(error));
  } catch {
    return new Error(String(error));
  }
};
