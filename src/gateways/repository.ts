import { PoolClient } from "pg";
import { PaymentGateway } from "src";

export async function insertGatewayWebhook(
  client: PoolClient,
  gateway: PaymentGateway,
  payload: any
) {
  return await client.query(
    "insert into gateway_webhook(gateway, payload) values ($1, $2)",
    [gateway, payload]
  );
}
