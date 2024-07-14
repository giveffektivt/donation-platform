// @ts-nocheck
import type { ComponentType } from "react";
import { useState, useEffect } from "react";
// @ts-ignore
import { createStore } from "https://framer.com/m/framer/store.js@^1.0.0";

const emptyStore = {
  name: "",
  tin: "",
  email: "",
  address: "",
  postcode: "",
  city: "",
  env: "prod",
  isLoading: false,
};
const useStore = createStore(emptyStore);

// Buttons

export const submitMembershipForm = (Component: any): ComponentType => {
  return (props: any) => {
    const [store, setStore] = useStore();

    useEffect(() => {
      setStore({
        env: location.host === "giveffektivt.dk" ? "prod" : "dev",
      });
    }, [setStore]);

    const onTap = async () => submitMembership(store, setStore);

    return canSubmitMembership(store) ? (
      <Component {...props} onTap={onTap} />
    ) : null;
  };
};

export const submitMembershipForm_disabled = (
  Component: any,
): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    return !canSubmitMembership(store) ? <Component {...props} /> : null;
  };
};

// Inputs

const setInput = (Component: any, field: string, isValid): ComponentType => {
  return (props: any) => {
    const [store, setStore] = useStore();

    const onValueChange = (value: string) => setStore({ [field]: value });

    return (
      <Component
        {...props}
        value={store[field]}
        onValueChange={onValueChange}
        isError={
          isValid ? store[field] !== "" && !isValid(store[field]) : false
        }
      />
    );
  };
};

export const inputName = (Component: any): ComponentType => {
  return setInput(Component, "name");
};

export const inputEmail = (Component: any): ComponentType => {
  return setInput(Component, "email", (value) => value.includes("@"));
};

export const inputAddress = (Component: any): ComponentType => {
  return setInput(Component, "address");
};

export const inputPostcode = (Component: any): ComponentType => {
  return setInput(Component, "postcode");
};

export const inputCity = (Component: any): ComponentType => {
  return setInput(Component, "city");
};

export const inputCpr = (Component: any): ComponentType => {
  return (props: any) => {
    const [store, setStore] = useStore();
    const [hasTypedDash, setHasTypedDash] = useState(false);

    const onValueChange = (tin: string) => {
      if (tin.indexOf("-") === -1) {
        setHasTypedDash(false);
      } else if (tin[tin.length - 1] === "-") {
        setHasTypedDash(true);
      }

      if (tin.length == 10) {
        if (tin.indexOf("-") === -1) {
          tin = `${tin.slice(0, 6)}-${tin.slice(6)}`;
        } else if (!hasTypedDash) {
          tin = tin.replace("-", "");
        }
      }

      setStore({ tin });
    };

    return (
      <Component
        {...props}
        value={store.tin}
        onValueChange={onValueChange}
        isError={store.tin !== "" && !isCprValid(store.tin)}
      />
    );
  };
};

// Show warnings

export const showCprWarning = (Component: any): ComponentType => {
  return (props) => {
    const [store] = useStore();

    const isCprSuspicious = isCprValid(store.tin) && !isCprPlausible(store.tin);

    return isCprSuspicious ? <Component {...props} /> : null;
  };
};

// Debug

export const showDebug = (Component: any): ComponentType => {
  return (props) => {
    const [store] = useStore();

    return store.env === "prod" ? null : (
      <Component
        {...props}
        text={`${JSON.stringify(prepareMembershipPayload(store), null, 4)}`}
      />
    );
  };
};
