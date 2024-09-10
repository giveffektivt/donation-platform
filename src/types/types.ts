export type SubmitDataDonation = {
  amount: number;
  recipient: string;
  frequency: string;
  taxDeductible: boolean;
  tin?: string;
  email: string;
  method: string;
  subscribeToNewsletter: boolean;
  fundraiserId?: string;
  message?: string;
};

export type SubmitDataMembership = {
  name: string;
  tin: string;
  email: string;
  address: string;
  postcode: string;
  city: string;
  country: string;
};

export type SubmitDataGavebrev = {
  name: string;
  tin: string;
  email: string;
  startYear: number;
  amount?: number;
  percentage?: number;
  minimalIncome?: number;
};

export type SubmitDataGavebrevStatus = {
  id: string;
  status: string;
};

export type SubmitDataGavebrevStop = {
  id: string;
};

export type SubmitDataRenewPayment = {
  id: string;
};

export type SubmitDataFundraiser = {
  id: string;
};
