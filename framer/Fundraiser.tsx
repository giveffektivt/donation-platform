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
        if (id == null || !isUUIDv4.test(id)) {
          // ignore framer preview
          if (id?.endsWith(".html")) {
            setStore({
              raised: 0,
              hasError: false,
              isLoading: false,
            });
            return;
          }
          throw new Error(`Unable to find ID in the URL, '${id}' is not uuid`);
        }

        const response = await fetch(apiUrl("prod", `fundraiser/${id}`));

        if (!response.ok) {
          throw new Error(`${response.status}`);
        }

        const body = await response.json();
        setStore({
          raised: new Intl.NumberFormat("da-DK").format(body.raised),
          hasError: false,
          isLoading: false,
        });
      };

      request().catch((err: Error) => {
        setStore({ data: null, hasError: true, isLoading: false });
        notifyAboutClientSideError("fundraiser loadData", err?.toString());
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
