import Cors from "cors";
import util from "util";

export const cors = util.promisify(
  Cors({
    origin: [
      "https://giveffektivt.dk",
      ...(process.env.DEV_WEBSITE_DOMAINS
        ? process.env.DEV_WEBSITE_DOMAINS.split(",")
        : []),
    ],
  }),
);

export const corsHeaders = (origin: string | null) => {
  const allowed = [
    "https://giveffektivt.dk",
    ...(process.env.DEV_WEBSITE_DOMAINS
      ? process.env.DEV_WEBSITE_DOMAINS.split(",")
      : []),
  ];

  return {
    "Access-Control-Allow-Headers": "Authorization",
    "Access-Control-Allow-Methods": "GET,POST",
    ...(origin && allowed.includes(origin)
      ? { "Access-Control-Allow-Origin": origin }
      : {}),
  };
};
