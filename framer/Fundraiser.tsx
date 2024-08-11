import type { ComponentType } from "react";
import { useEffect } from "react";

// @ts-ignore
import { createStore } from "https://framer.com/m/framer/store.js@^1.0.0";

const apiProd = "https://donation-platform.vercel.app";
const apiDev =
  "https://donation-platform-info-giveffektivt-giv-effektivts-projects.vercel.app";

const useStore = createStore({
  data: {
    title: null,
    description: null,
    media: null,
    target: null,
    raised: null,
  },
  hasError: false,
  isLoading: true,
});

export const loadData = (Component: any): ComponentType => {
  return (props: any) => {
    const [_, setStore] = useStore();

    useEffect(() => {
      const request = async () => {
        const id = new URLSearchParams(window.location.search).get("id");
        if (id == null) {
          throw new Error("Unable to find ID in the URL");
        }

        const response = await fetch(
          `${apiUrl("prod", "fundraiser")}?id=${id}`,
        );

        if (!response.ok) {
          throw new Error(response.statusText);
        }

        const body = await response.json();
        setStore({
          data: {
            ...body,
            target: new Intl.NumberFormat("da-DK").format(body.target),
            raised: new Intl.NumberFormat("da-DK").format(body.raised),
          },
          hasError: false,
          isLoading: false,
        });
      };

      request().catch((err) => {
        setStore({ data: null, hasError: true, isLoading: false });
        console.error(err.message);
      });
    }, []);

    return <Component {...props} />;
  };
};

export const showLoading = (Component: any): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    return !store.hasError && store.isLoading ? <Component {...props} /> : null;
  };
};

export const showError = (Component: any): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    return store.hasError ? <Component {...props} /> : null;
  };
};

export const showNoError = (Component: any): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    return !store.hasError && !!store.data.title ? (
      <Component {...props} />
    ) : null;
  };
};

export const showTitle = (Component: any): ComponentType =>
  showField(Component, "title");

export const showDescription = (Component: any): ComponentType =>
  showField(Component, "description");

export const showTarget = (Component: any): ComponentType =>
  showField(Component, "target");

export const showRaised = (Component: any): ComponentType =>
  showField(Component, "raised");

export const showField = (Component: any, key: string): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    return !store.hasError && store.data[key] !== null ? (
      <Component {...props} text={store.data[key].toString() ?? "..."} />
    ) : null;
  };
};

export const showMedia =
  (Component: any): ComponentType =>
  (props: any) => {
    const [store] = useStore();
    return !store.hasError && store.data.media !== null ? (
      <Component {...props} url={store.data.media} />
    ) : null;
  };

const apiUrl = (env: string, path: string): string => {
  return `${env === "prod" ? apiProd : apiDev}/api/${path}`;
};
