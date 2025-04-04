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
  organizations: OrgAggregation;
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
    const period =
      item.transferred_at === "Næste overførsel"
        ? item.transferred_at
        : item.transferred_at.slice(0, 7);
    if (!unitMap[item.unit]) {
      unitMap[item.unit] = {
        total: {},
        monthly: Object.assign({}, { numberOfOutputs: {} }),
      };
    }
    const currentUnit = unitMap[item.unit];
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
        organizations: unitData.monthly[period],
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
        organizations: unitData.total,
      },
      monthly,
    };
  });
}
