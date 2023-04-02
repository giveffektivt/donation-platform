import { UTCDate } from "@date-fns/utc";

export const utc = (d: Date) =>
  new UTCDate(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds()
  );
