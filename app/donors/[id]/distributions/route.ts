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
        kid: "2222222",
        donorId,
        taxUnitId: 1,
        causeAreas: [
          {
            causeAreaId: 1,
            name: "Global Health and Development",
            standardSplit: true,
            percentageShare: "25.00",
            organizations: [
              {
                id: 5,
                name: "Against Malaria Foundation",
                percentageShare: "25.00",
              },
              {
                id: 6,
                name: "GiveWells tildelingsfond",
                percentageShare: "75.00",
              },
            ],
          },
          {
            causeAreaId: 2,
            name: "Animal Welfare",
            standardSplit: true,
            percentageShare: "75.00",
            organizations: [
              {
                id: 5,
                name: "Against Malaria Foundation",
                percentageShare: "25.00",
              },
              {
                id: 6,
                name: "GiveWells tildelingsfond",
                percentageShare: "75.00",
              },
            ],
          },
        ],
      },
    ],
  });
}
