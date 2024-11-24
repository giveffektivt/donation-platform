import type { ComponentType } from "react";
import { useEffect } from "react";

// @ts-ignore
import { createStore } from "https://framer.com/m/framer/store.js@^1.0.0";

const useStore = createStore({
  data: [],
  hasError: false,
  isLoading: false,
});

export const loadData = (Component: any): ComponentType => {
  return (props: any) => {
    const [_, setStore] = useStore();

    useEffect(() => {
      const request = async () => {
        setStore({ isLoading: true });

        const id = new URLSearchParams(window.location.search).get("id");
        if (id == null) {
          throw new Error("Unable to find ID in the URL");
        }

        const key = new URLSearchParams(window.location.hash.substring(1)).get(
          "key",
        );
        if (key == null) {
          throw new Error("Unable to find key in the URL");
        }

        const response = await fetch(apiUrl("prod", `fundraiser-kpi/${id}`), {
          headers: { Authorization: `Bearer ${key}` },
        });

        if (!response.ok) {
          throw new Error(`${response.status}`);
        }

        const body = await response.json();
        setStore({
          data: body,
          hasError: false,
          isLoading: false,
        });
      };

      request().catch((err: Error) => {
        setStore({ data: null, hasError: true, isLoading: false });
        notifyAboutClientSideError(
          "fundraiser-admin loadData",
          err?.toString(),
        );
      });
    }, []);

    return <Component {...props} />;
  };
};

export const showLoading = (Component: any): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    return store.isLoading ? <Component {...props} /> : null;
  };
};

export const showError = (Component: any): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    return store.hasError ? <Component {...props} /> : null;
  };
};

export const showHasData = (Component: any): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    return !store.hasError && store.data?.length ? (
      <Component {...props} />
    ) : null;
  };
};

export const showData = (Component: any): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    return !store.hasError && store.data?.length ? (
      <div>
        {store.data.map((item: any, idx: number) => (
          <div key={idx} style={{ marginTop: "50px" }}>
            <div style={{ display: "flex" }}>
              <Component {...props} text="📅 " />
              <Component
                {...props}
                text={item.created_at.slice(0, 16).replace("T", " ")}
              />
            </div>
            <div style={{ display: "flex" }}>
              <Component {...props} text="🔄 " />
              <Component {...props} text={item.frequency} />
            </div>
            {item.cancelled && (
              <div style={{ display: "flex" }}>
                <Component {...props} text={"❌ Cancelled"} />
              </div>
            )}
            <div style={{ display: "flex" }}>
              <Component {...props} text="💰 " />
              <Component
                {...props}
                text={`${item.total_amount.toLocaleString("da-DK")} kr. donated in total`}
              />
            </div>
            {item.message && (
              <Component
                {...props}
                text={item.message}
                style={{ textWrap: "wrap", marginTop: "10px" }}
              />
            )}
          </div>
        ))}
      </div>
    ) : null;
  };
};
