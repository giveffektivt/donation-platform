import {
  dbClient,
  dbRelease,
  getLatestScanpaySeq,
  handleChange,
  insertScanpaySeq,
  lockScanpaySeq,
  logError,
  unlockScanpaySeq,
} from "src";

const scanpay = require("scanpay")(process.env.SCANPAY_KEY);

export async function POST(req: Request) {
  let db = null;

  try {
    // Validate that the request comes from Scanpay
    await scanpay.sync.parsePing(
      await req.text(),
      req.headers.get("X-Signature"),
    );

    db = await dbClient();

    // Obtain an exclusive lock for scanpay_seq table
    await lockScanpaySeq(db);

    // All the seq numbers are stored in database. The most recent one represents the place
    // where we are in the string of changes send by Scanpay
    const dbSeq = await getLatestScanpaySeq(db);

    // Pull latest changes from Scanpay since the last known seq
    const { changes, seq: scanpaySeq } = await scanpay.sync.pull(dbSeq, {
      hostname: process.env.SCANPAY_HOSTNAME,
    });

    // Process all the new changes
    if (changes.length > 0) {
      console.log(
        `Processing ${changes.length} Scanpay changes (seq ${dbSeq} -> ${scanpaySeq})`,
      );

      for (const change of changes) {
        await handleChange(db, change);
      }
    }

    // Save new seq to DB
    if (dbSeq !== scanpaySeq) {
      await insertScanpaySeq(db, scanpaySeq);
    }

    return Response.json({ message: "OK" });
  } catch (err) {
    logError("api/ping:", err);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    if (db) {
      await unlockScanpaySeq(db);
      dbRelease(db);
    }
  }
}
