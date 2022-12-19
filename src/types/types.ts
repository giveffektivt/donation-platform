export type SubmitDataDonation = {
  amount: number;
  recipient: string;
  subscription: string;
  taxDeduction: boolean;
  tin?: string;
  email: string;
  method: string;
  subscribeToNewsletter: boolean;
};

export type SubmitDataMembership = {
  name: string;
  tin: string;
  email: string;
  address: string;
  zip: string;
  city: string;
};
