// @ts-nocheck
import type { ComponentType } from "react";
import { useState, useEffect } from "react";
// @ts-ignore
import { createStore } from "https://framer.com/m/framer/store.js@^1.0.0";

const emptyStore = {
  email: "",
  env: "prod",
  isLoading: false,
  isSubscribed: false,
  isFailed: false,
};
const useStore = createStore(emptyStore);

// Buttons

export const submitNewsletterForm = (Component: any): ComponentType => {
  return (props: any) => {
    const [store, setStore] = useStore();

    useEffect(() => {
      setStore({
        env: location.host === "giveffektivt.dk" ? "prod" : "dev",
      });
    }, [setStore]);

    const onTap = async () => submitNewsletter(store, setStore);

    return store.email.includes("@") &&
      !store.isLoading &&
      !store.isSubscribed &&
      !store.isFailed ? (
      <Component {...props} onTap={onTap} />
    ) : null;
  };
};

export const submitNewsletterForm_isDisabled = (
  Component: any,
): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    return !store.email.includes("@") &&
      !store.isLoading &&
      !store.isSubscribed &&
      !store.isFailed ? (
      <Component {...props} />
    ) : null;
  };
};

export const submitNewsletterForm_isLoading = (
  Component: any,
): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    return store.isLoading ? <Component {...props} /> : null;
  };
};

export const submitNewsletterForm_isSubscribed = (
  Component: any,
): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    return store.isSubscribed ? <Component {...props} /> : null;
  };
};

export const submitNewsletterForm_isFailed = (
  Component: any,
): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    return store.isFailed ? <Component {...props} /> : null;
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

export const inputEmail = (Component: any): ComponentType => {
  return setInput(Component, "email", (value) => value.includes("@"));
};

// Debug

export const showDebug = (Component: any): ComponentType => {
  return (props) => {
    const [store] = useStore();

    return store.env === "prod" ? null : (
      <Component
        {...props}
        text={`${JSON.stringify(prepareNewsletterPayload(store), null, 4)}`}
      />
    );
  };
};
