import type { ComponentType } from "react";
import { useEffect } from "react";

// @ts-ignore
import { createStore } from "https://framer.com/m/framer/store.js@^1.0.0";

const apiProd = "https://donation-platform.vercel.app";

const useStore = createStore({
  members_confirmed: null,
  members_campaign: null,
  matched: null,
  matched_vitaminA: null,
});

export const loadMembersKpi = (Component: any): ComponentType => {
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
          members_confirmed: body.kpi.members_confirmed.toLocaleString("da-DK"),
          members_campaign: body.members_campaign.toLocaleString("da-DK"),
          matched: (body.members_campaign * 100).toLocaleString("da-DK"),
          matched_vitaminA: Math.floor(
            (body.members_campaign * 100) / 7,
          ).toLocaleString("da-DK"),
        });
      };

      request().catch((err) => console.error(err.message));
    }, [setStore]);

    return <Component {...props} />;
  };
};

export const showMembersConfirmed = (Component: any): ComponentType => {
  return showMembershipKpi(Component, "members_confirmed");
};

export const showMembersCampaign = (Component: any): ComponentType => {
  return showMembershipKpi(Component, "members_campaign");
};

export const showCampaignMatched = (Component: any): ComponentType => {
  return showMembershipKpi(Component, "matched");
};

export const showCampaignMatchedVitaminA = (Component: any): ComponentType => {
  return showMembershipKpi(Component, "matched_vitaminA");
};

const showMembershipKpi = (Component: any, kpi: string): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    return <Component {...props} amount={store[kpi] ?? "..."} />;
  };
};
