export type FormikData = SubmitData;

export type SubmitData = {
  amount: number;
  recipient: string;
  subscription: string;
  name?: string;
  email: string;
  method: string;
  tin?: string;
  membership: boolean;
  city?: string;
  zip?: string;
  address?: string;
  taxDeduction: boolean;
  birthday?: Date;
  country?: string;
  subscribeToNewsletter: boolean;
};
