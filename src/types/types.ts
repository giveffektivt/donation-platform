export type SubmitDataDonation = {
  amount: number;
  recipient: string;
  frequency: string;
  taxDeductible: boolean;
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
  postcode: string;
  city: string;
};
