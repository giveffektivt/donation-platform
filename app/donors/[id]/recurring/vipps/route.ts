export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const donorID = (await params).id;
  return Response.json({
    status: 200,
    content: [
      {
        ID: "agr_58LgZZM",
        status: "ACTIVE",
        donorID,
        full_name: "Keef",
        KID: "2222222",
        timestamp_created: "2021-05-14T18:19:49.000Z",
        monthly_charge_day: 10,
        force_charge_date: null,
        paused_until_date: null,
        amount: 100,
        agreement_url_code: "1ijd9n1f0asd",
      },
    ],
  });
}
