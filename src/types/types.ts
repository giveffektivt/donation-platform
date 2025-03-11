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

export type SubmitDataDonationRegister = {
  distributionCauseAreas: {
    id: number;
    name?: string;
    standardSplit: boolean;
    percentageShare: string;
    organizations: {
      id: number;
      name?: string;
      widgetDisplayName?: string;
      percentageShare: string;
    }[];
  }[];
  donor: {
    email: string;
    name: string;
    taxDeduction: boolean;
    newsletter: boolean;
    ssn?: string;
  };
  method: number;
  recurring: boolean;
  amount: string | number;
};

export type SubmitDataMembership = {
  name: string;
  tin: string;
  email: string;
  address: string;
  postcode: string;
  city: string;
  country: string;
  birthday?: Date;
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

export type SubmitDataNewFundraiser = {
  title: string;
  email: string;
  has_activity_match: boolean;
  activity_match_currency?: string;
};

export type SubmitDataNewsletter = {
  email: string;
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
