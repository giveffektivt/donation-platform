import { PoolClient } from "pg";
import { Donor } from "src";

export async function insertDonor(
  client: PoolClient,
  donor: Partial<Donor>,
): Promise<Donor> {
  return (
    await client.query(
      "select * from register_donor(email => $1, tin => $2, name => $3, address => $4, postcode => $5, city => $6, country => $7, birthday => $8)",
      [
        donor.email,
        donor.tin,
        donor.name,
        donor.address,
        donor.postcode,
        donor.city,
        donor.country,
        donor.birthday,
      ],
    )
  ).rows[0];
}
