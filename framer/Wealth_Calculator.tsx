// @ts-nocheck
import type { ComponentType } from "react";
import { useState, useEffect } from "react";
// @ts-ignore
import { createStore } from "https://framer.com/m/framer/store.js@^1.0.0";

const emptyStore = {
  income1: "",
  income2: "",
  income3: "",
  numberOfAdults: 1,
  numberOfChildren: 0,
  donationPct: 10,
};
const useStore = createStore(emptyStore);

export const showRicherThan = (Component): ComponentType => {
  return (props) => {
    const [store] = useStore();
    const wealthPercentile = calculateWealthPercentile(
      calculateDailyIncome(store, false),
    );
    return <Component {...props} text={`${wealthPercentile}`} />;
  };
};

export const showRicherThanAfterDonation = (Component): ComponentType => {
  return (props) => {
    const [store] = useStore();
    const wealthPercentile = calculateWealthPercentile(
      calculateDailyIncome(store, true),
    );
    return <Component {...props} text={`${wealthPercentile}`} />;
  };
};

// Inputs

const setIncomeInput = (Component, adultNo: number): ComponentType => {
  return (props) => {
    const [store, setStore] = useStore();
    const field = `income${adultNo}`;

    const onValueChange = (value: string) => {
      const newNumber = Number.parseFloat(value);
      if (value === "" || !Number.isNaN(newNumber)) {
        setStore({ [field]: value });
      }
    };

    return (
      <Component
        {...props}
        value={store[field]}
        onValueChange={onValueChange}
      />
    );
  };
};

export const inputIncome1 = (Component): ComponentType =>
  setIncomeInput(Component, 1);

export const inputIncome2 = (Component): ComponentType =>
  setIncomeInput(Component, 2);

export const inputIncome3 = (Component): ComponentType =>
  setIncomeInput(Component, 3);

const showIncomeInput = (Component, adultNo: number): ComponentType => {
  return (props) => {
    const [store, setStore] = useStore();
    return store.numberOfAdults >= adultNo ? <Component {...props} /> : null;
  };
};

export const showInputIncome2 = (Component): ComponentType =>
  showIncomeInput(Component, 2);

export const showInputIncome3 = (Component): ComponentType =>
  showIncomeInput(Component, 3);

// Selects

export const selectAdults = (Component: any): ComponentType => {
  return (props: any) => {
    const [store, setStore] = useStore();

    const onChange = (idx: number) => {
      setStore({ numberOfAdults: idx + 1 });
    };

    return (
      <Component {...props} value={store.numberOfAdults} onChange={onChange} />
    );
  };
};

export const selectChildren = (Component: any): ComponentType => {
  return (props: any) => {
    const [store, setStore] = useStore();

    const onChange = (idx: number) => {
      setStore({ numberOfChildren: idx });
    };

    return (
      <Component
        {...props}
        value={store.numberOfChildren + 1}
        onChange={onChange}
      />
    );
  };
};

// Slider

export const sliderDonationPct = (Component: any): ComponentType => {
  return (props: any) => {
    const [store, setStore] = useStore();

    const onChange = (donationPct: number) => {
      setStore({ donationPct });
    };

    return (
      <Component {...props} value={store.donationPct} onChange={onChange} />
    );
  };
};

// Impact

export const impactValues = (Component: any): ComponentType => {
  return (props: any) => {
    const [store, setStore] = useStore();

    const donationAmount = roundNumber(calculateDonationAmount(store));

    const malariaMedicin = Math.round(donationAmount / 50).toLocaleString(
      "da-DK",
    );
    const myggenet = Math.round(donationAmount / 35).toLocaleString("da-DK");
    const vitaminA = Math.round(donationAmount / 7).toLocaleString("da-DK");
    const vacciner = Math.round(donationAmount / 1000).toLocaleString("da-DK");

    return (
      <Component
        {...props}
        malariaMedicin={`${malariaMedicin}`}
        myggenet={myggenet}
        vitaminA={vitaminA}
        vacciner={vacciner}
      />
    );
  };
};

// Texts

export const textAmongRichest = (Component): ComponentType => {
  return (props: any) => {
    const [store, setStore] = useStore();

    const richestPct = calculateWealthPercentile(
      calculateDailyIncome(store, false),
    ).toLocaleString("da-DK");
    const pronoun = store.numberOfAdults > 1 ? "I" : "Du";

    return (
      <Component
        {...props}
        text={`${pronoun} er i dag blandt de ${richestPct}% rigeste i verden.`}
      />
    );
  };
};

export const textConsideration = (Component): ComponentType => {
  return (props: any) => {
    const [store, setStore] = useStore();

    const richestPctAfterDonation = calculateWealthPercentile(
      calculateDailyIncome(store, true),
    ).toLocaleString("da-DK");
    const donationAmount = roundNumber(
      calculateDonationAmount(store),
    ).toLocaleString("da-DK");

    const pronoun = store.numberOfAdults > 1 ? "I" : "du";
    const pronounPosessive = store.numberOfAdults > 1 ? "jeres" : "din";

    return (
      <Component
        {...props}
        text={`Hvis ${pronoun} gav ${store.donationPct}% af ${pronounPosessive} indkomst efter skat til velgørenhed, kunne ${pronoun} donere ${donationAmount} kr. om året og fortsat være blandt de ${richestPctAfterDonation}% rigeste i verden.`}
      />
    );
  };
};

export const textImpactTitle = (Component): ComponentType => {
  return (props: any) => {
    const [store, setStore] = useStore();

    const pronounPosessive = store.numberOfAdults > 1 ? "Jeres" : "Dine";

    return (
      <Component
        {...props}
        text={`${pronounPosessive} penge kan række langt`}
      />
    );
  };
};

export const textImpact = (Component): ComponentType => {
  return (props: any) => {
    const [store, setStore] = useStore();

    const donationAmount = roundNumber(
      calculateDonationAmount(store),
    ).toLocaleString("da-DK");

    const pronoun = store.numberOfAdults > 1 ? "I" : "du";

    return (
      <Component
        {...props}
        text={`Hvis ${pronoun} donerede ${donationAmount} kroner om året til effektiv velgørenhed ville ${pronoun} kunne påvirke mange menneskeliv:`}
      />
    );
  };
};

// Math

// 2017 - same year as data in wealthMountainGraphData below https://databank.worldbank.org/source/world-development-indicators/Series/PA.NUS.PPP
const PPP_FACTOR = 6.9;
// since 2017 till now - same year as data in wealthMountainGraphData below https://www.dst.dk/da/Statistik/emner/oekonomi/prisindeks/forbrugerprisindeks
const CUMULATIVE_INFLATION_PCT = 0.2;
// 2024 https://skat.dk/hjaelp/satser
const PERSONFRADRAG = 49700;
const AM_BIDRAG_PCT = 0.08;
const TOP_SKAT_PCT = 0.15;
const TOP_SKAT_THRESHOLD = 588900;
const KOMMUNE_SKAT_PCT = 0.251;
const BUNDSKAT_PCT = 0.1201;
const SKATTELOFT_PCT = 0.5207;

const calculateWealthPercentile = (dailyIncome: number): number => {
  const totalPopulation = wealthMountainGraphData.reduce(
    (sum, point) => sum + point.y,
    0,
  );

  const populationEarningLessOrSame = wealthMountainGraphData
    .filter((d) => d.x <= dailyIncome)
    .reduce((acc, curr) => acc + curr.y, 0);

  const indexOfPopulationEarningMore = wealthMountainGraphData.findIndex(
    (d) => d.x > dailyIncome,
  );

  let interpolatedPopulationSameBucketEarningLessOrSame = 0;
  if (indexOfPopulationEarningMore > 0) {
    const previousDailyIncome =
      wealthMountainGraphData[indexOfPopulationEarningMore - 1].x;
    const nextDailyIncome =
      wealthMountainGraphData[indexOfPopulationEarningMore].x;
    const populationNextBucket =
      wealthMountainGraphData[indexOfPopulationEarningMore].y;
    const fractionOfNextBucketEarningLessThanMe =
      (dailyIncome - previousDailyIncome) /
      (nextDailyIncome - previousDailyIncome);

    interpolatedPopulationSameBucketEarningLessOrSame =
      populationNextBucket * fractionOfNextBucketEarningLessThanMe;
  }

  const totalPopulationEarningLessOrSame =
    populationEarningLessOrSame +
    interpolatedPopulationSameBucketEarningLessOrSame;

  const wealthPercentile =
    (1 - totalPopulationEarningLessOrSame / totalPopulation) * 100;

  return roundNumber(wealthPercentile);
};

const calculateDailyIncome = (store, afterDonation: boolean): number => {
  const totalIncome =
    calculateTotalPostTaxIncome(store) -
    (afterDonation ? calculateDonationAmount(store) : 0);

  const equivalizedIncome =
    totalIncome /
    (1 + 0.3 * store.numberOfChildren + 0.5 * (store.numberOfAdults - 1));

  const dailyIncome =
    equivalizedIncome / 365 / PPP_FACTOR / (1 + CUMULATIVE_INFLATION_PCT);

  return dailyIncome;
};

const calculateTotalPostTaxIncome = (store): number => {
  return (
    calculatePostTax(store.income1) +
    calculatePostTax(store.income2) * (store.numberOfAdults > 1 ? 1 : 0) +
    calculatePostTax(store.income3) * (store.numberOfAdults > 2 ? 1 : 0)
  );
};

const calculateDonationAmount = (store): number => {
  return calculateTotalPostTaxIncome(store) * (store.donationPct / 100);
};

const calculatePostTax = (income: number): number => {
  const amBidrag = income * AM_BIDRAG_PCT;
  const taxable = Math.max(0, income - amBidrag - PERSONFRADRAG);
  const bundSkat = taxable * BUNDSKAT_PCT;
  const kommuneSkat = taxable * KOMMUNE_SKAT_PCT;
  const topSkat = Math.max(0, taxable - TOP_SKAT_THRESHOLD) * TOP_SKAT_PCT;
  const skatteLoft = Math.max(0, (income - amBidrag) * SKATTELOFT_PCT);
  return (
    income - amBidrag - Math.min(kommuneSkat + bundSkat + topSkat, skatteLoft)
  );
};

const roundNumber = (value: number): number => {
  return Math.round(value * 10) / 10;
};

// https://github.com/stiftelsen-effekt/main-site/blob/main/components/main/blocks/WealthCalculator/data.ts
const wealthMountainGraphData = [
  { x: 0, y: 0 },
  { x: 0.01031, y: 11014 },
  { x: 0.0136, y: 26747 },
  { x: 0.01795, y: 42852 },
  { x: 0.02368, y: 61559 },
  { x: 0.03125, y: 84241 },
  { x: 0.04123, y: 114968 },
  { x: 0.05441, y: 164218 },
  { x: 0.07179, y: 254196 },
  { x: 0.09473, y: 431583 },
  { x: 0.125, y: 784429 },
  { x: 0.16494, y: 1469111 },
  { x: 0.21764, y: 2652502 },
  { x: 0.28717, y: 4610056 },
  { x: 0.37893, y: 8336160 },
  { x: 0.5, y: 15727837 },
  { x: 0.65975, y: 28727022 },
  { x: 0.87055, y: 52174974 },
  { x: 1.1487, y: 91747453 },
  { x: 1.51572, y: 156287967 },
  { x: 2, y: 262440200 },
  { x: 2.63902, y: 409579777 },
  { x: 3.4822, y: 589616825 },
  { x: 4.59479, y: 745958022 },
  { x: 6.06287, y: 816928185 },
  { x: 8, y: 801400751 },
  { x: 10.55606, y: 752616627 },
  { x: 13.92881, y: 664405974 },
  { x: 18.37917, y: 565691692 },
  { x: 24.25147, y: 458829842 },
  { x: 32, y: 372970756 },
  { x: 42.22425, y: 331239587 },
  { x: 55.71524, y: 294024005 },
  { x: 73.51669, y: 240065510 },
  { x: 97.00586, y: 173794948 },
  { x: 128, y: 109969124 },
  { x: 168.89701, y: 63847976 },
  { x: 222.86094, y: 33851922 },
  { x: 294.06678, y: 17131932 },
  { x: 388.02344, y: 8354858 },
  { x: 512, y: 3921168 },
  { x: 675.58805, y: 1835729 },
  { x: 891.44378, y: 1051263 },
  { x: 1176.26712, y: 710308 },
  { x: 1552.09376, y: 481437 },
  { x: 2048, y: 322692 },
  { x: 2702.3522, y: 214598 },
  { x: 3565.77511, y: 142162 },
  { x: 4705.06846, y: 94952 },
  { x: 6208.37506, y: 64488 },
  { x: 8192, y: 44553 },
];

// Debug

export const showDebug = (Component): ComponentType => {
  return (props) => {
    const [store] = useStore();

    return !location || location.host === "giveffektivt.dk" ? null : (
      <Component
        {...props}
        text={`${JSON.stringify(
          {
            ...store,
            householdPostTaxIncome: roundNumber(
              calculateTotalPostTaxIncome(store),
            ),
            totalDonationAmount: roundNumber(calculateDonationAmount(store)),
            dailyIncome: roundNumber(calculateDailyIncome(store, false)),
            richerThan: calculateWealthPercentile(
              calculateDailyIncome(store, false),
            ),
            richerThanAfterDonations: calculateWealthPercentile(
              calculateDailyIncome(store, true),
            ),
          },
          null,
          4,
        )}`}
      />
    );
  };
};
