import Cors from "cors";
import util from "util";

export const cors = util.promisify(
  Cors({
    origin: [
      "https://giveffektivt.dk",
      "https://glad-function-083442.framer.app",
    ],
  })
);
