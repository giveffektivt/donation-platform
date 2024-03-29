import type { ComponentType } from "react";
import { useEffect } from "react";

// @ts-ignore
import { createStore } from "https://framer.com/m/framer/store.js@^1.0.0";

const apiProd = "https://donation-platform.vercel.app";

const useStore = createStore({
  dkk_total: null,
  dkk_last_30_days: null,
  monthly_donors: null,
});

export const loadKpi = (Component: any): ComponentType => {
  return (props) => {
    const [_, setStore] = useStore();

    useEffect(() => {
      const request = async () => {
        const response = await fetch(`${apiProd}/api/kpi`, {
          method: "GET",
        });

        if (!response.ok) {
          throw new Error(response.statusText);
        }

        const body = await response.json();

        setStore({
          dkk_total:
            (Math.floor(body.kpi.dkk_total / 1e5) / 10).toLocaleString(
              "da-DK",
              {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              },
            ) + "M",
          dkk_last_30_days: body.kpi.dkk_last_30_days.toLocaleString("da-DK"),
          monthly_donors: body.kpi.monthly_donors.toLocaleString("da-DK"),
        });
      };

      request().catch((err) => console.error(err.message));
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

const showKpi = (Component: any, kpi: string): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    return <Component {...props} amount={store[kpi] || "..."} />;
  };
};
