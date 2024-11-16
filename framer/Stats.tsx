import type { ComponentType } from "react";
import { useEffect } from "react";

// @ts-ignore
import { createStore } from "https://framer.com/m/framer/store.js@^1.0.0";

const useStore = createStore({
  dkk_total: null,
  dkk_last_30_days: null,
  monthly_donors: null,
  members_confirmed: null,
});

export const loadKpi = (Component: any): ComponentType => {
  return (props) => {
    const [_, setStore] = useStore();

    useEffect(() => {
      const request = async () => {
        const response = await fetch(apiUrl("prod", "kpi"), {
          method: "GET",
        });

        if (!response.ok) {
          throw new Error(response.statusText);
        }

        const body = await response.json();

        setStore({
          dkk_total: `${(
            Math.floor(body.kpi.dkk_total / 1e5) / 10
          ).toLocaleString("da-DK", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}M`,
          dkk_last_30_days: body.kpi.dkk_last_30_days.toLocaleString("da-DK"),
          monthly_donors: body.kpi.monthly_donors.toLocaleString("da-DK"),
          members_confirmed: body.kpi.members_confirmed.toLocaleString("da-DK"),
        });
      };

      request().catch(async (err) => {
        console.error(err.message);

        try {
          await reportError("prod");
        } catch (e) {
          console.error(e);
        }
      });
    }, []);

    return <Component {...props} />;
  };
};

export const showDonationsTotal = (Component: any): ComponentType => {
  return showKpi(Component, "dkk_total");
};

export const showDonationsLastMonth = (Component: any): ComponentType => {
  return showKpi(Component, "dkk_last_30_days");
};

export const showMonthlyDonors = (Component: any): ComponentType => {
  return showKpi(Component, "monthly_donors");
};

export const showMembersConfirmed = (Component: any): ComponentType => {
  return showKpi(Component, "members_confirmed");
};

const showKpi = (Component: any, kpi: string): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    return <Component {...props} amount={store[kpi] || "..."} />;
  };
};
