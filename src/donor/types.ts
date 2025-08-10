export type DonorAnon = {
  id: string;
  created_at: Date;
  updated_at: Date;
};

export type DonorContact = DonorAnon & {
  name: string;
  email: string;
};

export type Donor = DonorContact & {
  address: string;
  postcode: string;
  city: string;
  country: string;
  tin: string;
  birthday: Date;
};
