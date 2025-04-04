import {
  dbClient,
  dbRelease,
  getTransferOverview,
  logError,
  type TransferredDistribution,
} from "src";

export async function GET() {
  let db = null;

  try {
    db = await dbClient();

    const transfer_overview = await getTransferOverview(db);

    return Response.json({
      status: 200,
      content: buildOverview(transfer_overview),
    });
  } catch (e) {
    logError("results/donations/monthly/outputs: ", e);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}

type OrgAggregation = {
  [recipient: string]: {
    direct: { sum: number; numberOfOutputs: number };
    smartDistribution: { sum: number; numberOfOutputs: number };
  };
};

type PeriodAggregation = {
  period: string;
  numberOfOutputs: number;
  organizations: OrgAggregation[];
};

type OutputStructure = {
  output: string;
  total: PeriodAggregation;
  monthly: PeriodAggregation[];
};

function buildOverview(data: TransferredDistribution[]): OutputStructure[] {
  const unitMap: {
    [unit: string]: {
      total: OrgAggregation;
      monthly: { [period: string]: OrgAggregation } & {
        numberOfOutputs: { [period: string]: number };
      };
    };
  } = {};

  for (const item of data) {
    // TODO
    const unit = mapToNorwegianUnit(item.unit);
    // TODO
    const period =
      item.transferred_at === "Næste overførsel"
        ? item.transferred_at
        : item.transferred_at.slice(0, 7);

    if (!unitMap[unit]) {
      unitMap[unit] = {
        total: {},
        monthly: Object.assign({}, { numberOfOutputs: {} }),
      };
    }
    const currentUnit = unitMap[unit];
    const cat =
      item.earmark === "Giv Effektivts anbefaling"
        ? "smartDistribution"
        : "direct";
    function addValue(orgAgg: OrgAggregation) {
      if (!orgAgg[item.recipient]) {
        orgAgg[item.recipient] = {
          direct: { sum: 0, numberOfOutputs: 0 },
          smartDistribution: { sum: 0, numberOfOutputs: 0 },
        };
      }
      orgAgg[item.recipient][cat].sum += item.total_dkk;
      orgAgg[item.recipient][cat].numberOfOutputs += item.unit_impact;
    }
    addValue(currentUnit.total);
    if (!currentUnit.monthly[period]) {
      currentUnit.monthly[period] = {};
      currentUnit.monthly.numberOfOutputs[period] = 0;
    }
    addValue(currentUnit.monthly[period]);
    currentUnit.monthly.numberOfOutputs[period] += item.unit_impact;
  }

  return Object.keys(unitMap).map((unit) => {
    const unitData = unitMap[unit];
    const monthly: PeriodAggregation[] = Object.keys(unitData.monthly)
      .filter((key) => key !== "numberOfOutputs")
      .map((period) => ({
        period,
        numberOfOutputs: unitData.monthly.numberOfOutputs[period],
        organizations: Object.entries(unitData.monthly[period]).map(
          ([key, value]) => ({ [key]: value }),
        ),
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
    const totalNumberOfOutputs = Object.values(unitData.total).reduce(
      (acc, org) => {
        return (
          acc +
          org.direct.numberOfOutputs +
          org.smartDistribution.numberOfOutputs
        );
      },
      0,
    );
    return {
      output: unit,
      total: {
        period: "Total",
        numberOfOutputs: totalNumberOfOutputs,
        organizations: Object.entries(unitData.total).map(([key, value]) => ({
          [key]: value,
        })),
      },
      monthly,
    };
  });
}

function mapToNorwegianUnit(unit: string) {
  switch (unit) {
    case "Antimalaria myggenet udleveret":
      return "Myggnett";
    case "Ormekure udleveret":
      return "Ormekurer";
    case "Dollars modtaget":
      return "Dollar mottatt";
    case "A-vitamintilskud udleveret":
      return "A-vitamintilskudd";
    case "Malariamedicin udleveret":
      return "Malariabehandlinger";
    case "Vaccinationsprogrammer motiveret":
      return "Vaksinasjoner";
    default:
      return unit;
  }
}
