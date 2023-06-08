import Cors from "cors";
import util from "util";

export const cors = util.promisify(Cors({}));
