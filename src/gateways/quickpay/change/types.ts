export type QuickpayChange = {
  accepted: boolean;
  test_mode: boolean;
  type: string;
  order_id: string;
  operations: {
    id: number;
    type: string;
    qp_status_code: string;
  }[];
};
