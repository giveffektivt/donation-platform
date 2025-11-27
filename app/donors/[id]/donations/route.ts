export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const donorId = (await params).id;

  return Response.json({
    status: 200,
    content: [
      {
        // * @description The Auto-generated id of a donation */
        id: 44447,
        // /** @description Full name of the donor (first and last name) */
        donor: "John Doe",
        // /** @description The id of the donor */
        donorId,
        // /** @description The email of the donor */
        email: "hello@world.com",
        // /** @description The donation sum in decimal format
        sum: 400,
        // /** @description The transaction cost of the donation in decimal format */
        transactionCost: "77",
        // /** @description The payment method of the donation */
        paymentMethod: "MobilePay",
        /** @description The customer identification for the donation. Uniquely identifies the donor and the donation distribution. */
        KID: "2222222",
        // /** @description The id of the tax unit the donation is connected to */
        taxUnitId: 1,
        // /**
        //  * Format: date-time
        //  * @description The timestamp of the donation
        //  */
        timestamp: new Date().toISOString(),
      },
    ],
  });
}
