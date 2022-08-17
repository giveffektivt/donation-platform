import { PoolClient } from "pg";
import { DonorWithSensitiveInfo } from "src";

export async function insertDonorWithSensitiveInfo(
  client: PoolClient,
  donor: Partial<DonorWithSensitiveInfo>
): Promise<DonorWithSensitiveInfo> {
  return (
    await client.query(
      "insert into donor_with_sensitive_info(name, email, address, postcode, city, tin, birthday, country) values ($1, $2, $3, $4, $5, $6, $7, $8) returning *",
      [
        donor.name,
        donor.email,
        donor.address,
        donor.postcode,
        donor.city,
        donor.tin,
        donor.birthday,
        donor.country,
      ]
    )
  ).rows[0];
}
