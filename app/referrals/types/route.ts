export async function GET() {
  return Response.json({
    status: 200,
    content: buildReferrals([
      "Bekendt",
      "Avis",
      "Internetsøgning",
      "Podcast",
      "Sociale medier",
      "TV / Radio",
      "Effektiv Altruisme",
      "Andet",
    ]),
  });
}

function buildReferrals(referrals: string[]) {
  return referrals.map((referral, idx) => ({
    id: idx + 1,
    name: referral,
    ordering: idx + 1,
  }));
}
