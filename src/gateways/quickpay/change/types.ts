export type QuickpayChange = {
  accepted: boolean;
  acquirer: string;
  test_mode: boolean;
  type: string;
  state: string;
  order_id: string;
  operations: {
    id: number;
    type: string;
    qp_status_code: string;
    aq_status_msg: string;
  }[];
};
