import type { ComponentType } from "react";
import { useEffect } from "react";

// @ts-ignore
import { createStore } from "https://framer.com/m/framer/store.js@^1.0.0";

const apiProd = "https://donation-platform.vercel.app";
const apiDev = "https://donation-platform-info-giveffektivt.vercel.app";

const useStore = createStore({
  url: null,
  hasError: false,
});

export const loadUrl = (Component: any): ComponentType => {
  return (props: any) => {
    const [_, setStore] = useStore();

    useEffect(() => {
      const request = async () => {
        let id = new URLSearchParams(window.location.search).get("id");
        if (id == null) {
          throw new Error("Unable to find ID in the URL");
        }

        const response = await fetch(apiUrl("prod", "renew-payment"), {
          method: "POST",
          headers: { "Content-type": "application/json;charset=UTF-8" },
          body: JSON.stringify({ id }),
        });

        if (!response.ok) {
          throw new Error(response.statusText);
        }

        const body = await response.json();
        setStore({ url: body.url, hasError: false });
      };

      request().catch((err) => {
        setStore({ url: null, hasError: true });
        console.error(err.message);
      });
    }, []);

    return <Component {...props} />;
  };
};

export const showError = (Component: any): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    return store.hasError ? <Component {...props} /> : null;
  };
};

export const showInfo = (Component: any): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    return !store.hasError ? (
      <Component
        text={store.url == null ? "Henter data..." : null}
        {...props}
      />
    ) : null;
  };
};

export const renewPaymentButtonDesktop = (Component: any): ComponentType => {
  return renewPaymentButton(Component, "Desktop");
};

export const renewPaymentButtonPhone = (Component: any): ComponentType => {
  return renewPaymentButton(Component, "Phone");
};

const renewPaymentButton = (
  Component: any,
  breakpoint: string
): ComponentType => {
  return (props: any) => {
    const [store] = useStore();

    const variant = `${breakpoint}/Solid${
      store.url != null ? "" : " disabled"
    }`;

    const onTap = () => {
      window.open(store.url, "_parent");
    };

    return store.url != null ? (
      <Component {...props} tap={onTap} variant={variant} />
    ) : null;
  };
};

const apiUrl = (env: string, path: string): string => {
  return `${env === "prod" ? apiProd : apiDev}/api/${path}`;
};
