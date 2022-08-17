export type Donor = {
  id: string;
  created_at: Date;
  updated_at: Date;
};

export type DonorWithContactInfo = Donor & {
  name: string;
  email: string;
};

export type DonorWithSensitiveInfo = DonorWithContactInfo & {
  address: string;
  postcode: string;
  city: string;
  country: string;
  tin: string;
  birthday: Date;
};
