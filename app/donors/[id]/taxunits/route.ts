export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const donorId = (await params).id;

  return Response.json({
    status: 200,
    content: [
      {
        id: 1,
        donorId,
        name: "John Doe",
        ssn: "111111-1111",
        /**
         * Format: date-time
         * @description Indicates the date the unit was registered
         */
        registered: new Date().toISOString(),
        archived: null,
        sumDonations: 1000,
        numDonations: 3,
        taxDeductions: [
          {
            year: 2024,
            sumDonations: 600,
            deduction: 123,
            benefit: 456,
          },
          {
            year: 2023,
            sumDonations: 400,
            deduction: 123,
            benefit: 456,
          },
        ],
      },
    ],
  });
}
