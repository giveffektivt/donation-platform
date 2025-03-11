export async function GET() {
  return Response.json({
    status: 200,
    content: [
      {
        id: 1,
        name: "Global health",
        widgetDisplayName: null,
        widgetContext: null,
        shortDescription: "Global health",
        longDescription: "Global health",
        informationUrl: "https://giveffektivt.dk",
        isActive: true,
        ordering: 1,
        standardPercentageShare: 100,
        organizations: buildOrganizations([
          {
            name: "Giv Effektivts anbefaling",
            description:
              "Din donation fordeles efter Giv Effektivts anbefalinger for at skabe den størst mulige effekt.",
            infoUrl: "https://giveffektivt.dk/anbefalinger",
          },
          {
            name: "Myggenet mod malaria",
            description:
              "Myggenet beskytter familier imod malariamyg, mens de sover.",
            infoUrl: "https://giveffektivt.dk/myggenet",
          },
          {
            name: "Medicin mod malaria",
            description:
              "Der uddeles forebyggende malariamedicin i perioder, hvor smittetallet er særligt højt.",
            infoUrl: "https://giveffektivt.dk/malariamedicin",
          },
          {
            name: "Vitamin mod mangelsygdomme",
            description:
              "A-vitamin til børn under 5 år reducerer børnedødelighed i 21 lande.",
            infoUrl: "https://giveffektivt.dk/a-vitamin",
          },
          {
            name: "Vacciner til spædbørn",
            description:
              "Forældre får en økonomisk belønning for at få deres børn vaccineret.",
            infoUrl: "https://giveffektivt.dk/boernevacciner",
          },
          {
            name: "Kontantoverførsler til verdens fattigste",
            description:
              "Kontantoverførsler gives direkte til fattige familier, så de selv kan prioritere deres behov.",
            infoUrl: "https://giveffektivt.dk/kontantoverfoersler",
          },
          {
            name: "Giv Effektivts arbejde og vækst",
            description:
              "Din støtte til Giv Effektivts arbejde bidrager til vores drift og sikrer ca. 10x mere i donationer til vores anbefalede velgørenhedsformål.",
            infoUrl: "https://giveffektivt.dk",
          },
        ]),
      },
    ],
  });
}

function buildOrganizations(
  orgs: { name: string; description: string; infoUrl: string }[],
) {
  return orgs.map((org, idx) => ({
    id: idx + 1,
    name: org.name,
    widgetDisplayName: org.name,
    widgetContext: null,
    abbreviation: org.name,
    shortDescription: org.description,
    longDescription: org.name,
    standardShare: idx === 0 ? 100 : 0,
    informationUrl: org.infoUrl,
    isActive: true,
    ordering: idx + 1,
    causeAreaId: 1,
  }));
}
