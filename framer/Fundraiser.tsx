import type { ComponentType } from "react";
import { useEffect } from "react";

// @ts-ignore
import { createStore } from "https://framer.com/m/framer/store.js@^1.0.0";

const useStore = createStore({
  raised: null,
  hasError: false,
  isLoading: false,
});

export const loadData = (Component: any): ComponentType => {
  return (props: any) => {
    const [_, setStore] = useStore();

    useEffect(() => {
      const request = async () => {
        setStore({ isLoading: true });

        const cleanedUrl = window?.location
          ? window.location.href.split("?")[0].replace(/\/+$/, "")
          : null;
        const id = cleanedUrl?.substring(cleanedUrl.lastIndexOf("/") + 1);
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
          raised: new Intl.NumberFormat("da-DK").format(body.raised),
          hasError: false,
          isLoading: false,
        });
      };

      request().catch(async (err) => {
        setStore({ data: null, hasError: true, isLoading: false });
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

export const showRaised = (Component: any): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    return (
      <Component
        {...props}
        text={
          !store.hasError && store.raised !== null
            ? store.raised.toString()
            : "..."
        }
      />
    );
  };
};

export const showQr = (Component: any): ComponentType => {
  return (props: any) => {
    const cleanedUrl = window?.location
      ? window.location.href.split("?")[0].replace(/\/+$/, "")
      : null;
    const id = cleanedUrl?.substring(cleanedUrl.lastIndexOf("/") + 1);
    return id == null ? null : (
      <Component
        {...props}
        url={`https://kissapi-qrcode.vercel.app/api/qrcode?cht=qr&chs=200x200&chld=4|0&chl=${window?.location?.origin}/indsamling/${id}`}
      />
    );
  };
};
