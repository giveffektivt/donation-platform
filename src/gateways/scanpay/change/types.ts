export type ScanpayChange = {
  type: string;
  id: number;
  orderid: string;
  ref: string;
  rev: number;
  acts: { act: string; time: number; total: string }[];
  totals: {
    attempted: string;
    captured: string;
    refunded: string;
    authorized: string;
    left: string;
    voided: string;
  };
  time: { created: number; authorized: number };
};
