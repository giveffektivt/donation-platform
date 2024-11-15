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

export const corsHeaders = {
  "Access-Control-Allow-Methods": "GET,POST",
  "Access-Control-Allow-Origin": [
    "https://giveffektivt.dk",
    ...(process.env.DEV_WEBSITE_DOMAINS
      ? process.env.DEV_WEBSITE_DOMAINS.split(",")
      : []),
  ].join(","),
};
