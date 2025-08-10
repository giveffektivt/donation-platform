import { PoolClient } from "pg";
import { Donor } from "src";

export async function insertDonor(
  client: PoolClient,
  donor: Partial<Donor>,
): Promise<Donor> {
  return (
    await client.query(
      "insert into donor(name, email, address, postcode, city, tin, birthday, country) values ($1, $2, $3, $4, $5, $6, $7, $8) returning *",
      [
        donor.name,
        donor.email,
        donor.address,
        donor.postcode,
        donor.city,
        donor.tin,
        donor.birthday,
        donor.country,
      ],
    )
  ).rows[0];
}
