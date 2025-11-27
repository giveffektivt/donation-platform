export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const donorId = (await params).id;

  return Response.json({
    status: 200,
    content: [
      {
        // /** @description The organization's ID */
        ID: 2,
        // /** @description The name of the organization */
        organization: "Myggenet mod malaria",
        // /** @description Abbreviation of the organization's name */
        abbriv: "Myggenet mod malaria",
        /** @description The amount that was donated */
        value: 777,
        /** @description The year the donation was made */
        year: 2025,
      },
    ],
  });
}
