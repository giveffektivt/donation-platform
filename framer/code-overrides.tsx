// @ts-nocheck
import type { ComponentType } from "react";
import { useState, useEffect } from "react";
// @ts-ignore
import { createStore } from "https://framer.com/m/framer/store.js@^1.0.0";

const emptyStore = {
  amount: "",
  frequency: "Giv månedligt",
  method: "",
  tin: "",
  email: "",
  recipient: "",
  rulesAccepted: false,
  subscribeToNewsletter: false,
  taxDeductible: false,
  bank: {},
  bankMessage: "",
  bankAccount: "",
  env: "prod",
  step: "Step 1",
  isLoading: false,
  preselectedRecipient: "",
};
const useStore = createStore(emptyStore);

// Buttons

export const setAmount = (Component: any): ComponentType => {
  return setField(Component, "amount");
};

export const setMethod = (Component: any): ComponentType => {
  return setField(Component, "method");
};

export const setFrequency = (Component: any): ComponentType => {
  return setField(Component, "frequency");
};

const setField = (Component: any, field: string): ComponentType => {
  return (props: any) => {
    const [_, setStore] = useStore();

    const onTap = () => {
      const element = querySelector(`.${props.className}`);
      const value = element != null ? element.textContent : "";
      setStore({ [field]: value });
    };

    return <Component {...props} onTap={onTap} />;
  };
};

export const submitStep1 = (Component: any): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    return canSubmitStep1(store) ? <Component {...props} /> : null;
  };
};

export const submitStep1_disabled = (Component: any): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    return !canSubmitStep1(store) ? <Component {...props} /> : null;
  };
};

export const submitStep2 = (Component: any): ComponentType => {
  return (props: any) => {
    const [store, setStore] = useStore();

    const onTap = async () => submitDonation(store, setStore);

    return canSubmitStep2(store) ? (
      <Component {...props} onTap={onTap} />
    ) : null;
  };
};

export const submitStep2_disabled = (Component: any): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    return !canSubmitStep2(store) ? <Component {...props} /> : null;
  };
};

export const submitBank = (Component: any): ComponentType => {
  return (props: any) => {
    const [_, setStore] = useStore();
    const onTap = () => setStore(emptyStore);
    return <Component {...props} onTap={onTap} />;
  };
};

// Checkboxes

export const toggleRulesAccepted = (Component: any): ComponentType => {
  return toggleField(Component, "rulesAccepted");
};

export const toggleSubscribeToNewsletter = (Component: any): ComponentType => {
  return toggleField(Component, "subscribeToNewsletter");
};

export const toggleTaxDeductible = (Component: any): ComponentType => {
  return toggleField(Component, "taxDeductible");
};

const toggleField = (Component: any, field: string): ComponentType => {
  return (props: any) => {
    const [store, setStore] = useStore();

    const onTap = () => {
      setStore({ [field]: !store[field] });
    };

    return <Component {...props} onTap={onTap} />;
  };
};

// Inputs

export const inputAmount = (Component: any): ComponentType => {
  return (props: any) => {
    const [store, setStore] = useStore();

    const onValueChange = (amount: string) =>
      setStore({ amount: toAmount(amount) });

    return (
      <Component
        {...props}
        value={parseAmount(store.amount)}
        onValueChange={onValueChange}
      />
    );
  };
};

export const inputEmail = (Component: any): ComponentType => {
  return (props: any) => {
    const [store, setStore] = useStore();

    const onValueChange = (email: string) => setStore({ email });

    return (
      <Component {...props} value={store.email} onValueChange={onValueChange} />
    );
  };
};

export const inputCprCvr = (Component: any): ComponentType => {
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
        isError={
          !isCprCvrValid(store.taxDeductible, store.tin) && store.tin !== ""
        }
      />
    );
  };
};

// Selects

export const selectRecipient = (Component: any): ComponentType => {
  return (props: any) => {
    const [store, setStore] = useStore();
    const [index, setIndex] = useState(0);

    useEffect(() => {
      const idx =
        store.preselectedRecipient !== ""
          ? Math.max(
              0,
              findRecipientIndex(props.options, store.preselectedRecipient)
            )
          : index;

      setIndex(idx);
      setStore({ recipient: props.options[idx], preselectedRecipient: "" });
    }, [store.preselectedRecipient]);

    const onChange = (idx: number) => {
      setIndex(idx);
      setStore({ recipient: props.options[idx] });
    };

    return <Component {...props} value={index + 1} onChange={onChange} />;
  };
};

export const withRecipient = (Component: any, init: any): ComponentType => {
  return (props) => {
    const [_, setStore] = useStore();
    useEffect(() => init(setStore), []);
    return <Component {...props} />;
  };
};

export const withRecipientMyggenetModMalaria = (
  Component: any
): ComponentType => {
  return withRecipient(Component, (setStore) =>
    setStore({ preselectedRecipient: "Myggenet mod malaria" })
  );
};

export const withRecipientMedicinModMalaria = (
  Component: any
): ComponentType => {
  return withRecipient(Component, (setStore) =>
    setStore({ preselectedRecipient: "Medicin mod malaria" })
  );
};

export const withRecipientVitaminModMangelsygdomme = (
  Component: any
): ComponentType => {
  return withRecipient(Component, (setStore) =>
    setStore({ preselectedRecipient: "Vitamin mod mangelsygdomme" })
  );
};

export const withRecipientVaccinerTilSpædbørn = (
  Component: any
): ComponentType => {
  return withRecipient(Component, (setStore) =>
    setStore({ preselectedRecipient: "Vacciner til spædbørn" })
  );
};

// Show summary + bank

export const showAmount = (Component: any): ComponentType => {
  return (props) => {
    const [store] = useStore();
    return <Component {...props} text={`${store.amount}`} />;
  };
};

export const showBankAccount = (Component: any): ComponentType => {
  return (props) => {
    const [store] = useStore();
    return <Component {...props} text={`${store.bank.account}`} />;
  };
};

export const showBankMessage = (Component: any): ComponentType => {
  return (props) => {
    const [store] = useStore();
    return <Component {...props} text={`${store.bank.message}`} />;
  };
};

// Select component variant

const withVariant = (Component: any, getVariant: any): ComponentType => {
  return (props) => {
    const [store, setStore] = useStore();
    const [variant, fallback] = getVariant(store, setStore);
    const hasVariant =
      Component.propertyControls?.variant?.optionTitles?.includes(variant);
    return <Component {...props} variant={hasVariant ? variant : fallback} />;
  };
};

export const withVariantAmountDesktop = (Component: any): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => {
    const frequency = parseFrequency(store.frequency);
    return [
      `Desktop/${frequency}/${store.amount}`,
      `Desktop/${frequency}/None`,
    ];
  });
};

export const withVariantAmountPhone = (Component: any): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => {
    const frequency = parseFrequency(store.frequency);
    return [`Phone/${frequency}/${store.amount}`, `Phone/${frequency}/None`];
  });
};

export const withVariantFrequencyDesktop = (Component: any): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => [
    `Desktop/${store.frequency}`,
    `Desktop/None`,
  ]);
};

export const withVariantFrequencyPhone = (Component: any): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => [
    `Phone/${store.frequency}`,
    `Phone/None`,
  ]);
};

export const withVariantMethodDesktop = (Component: any): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => [
    `Desktop/${store.method}`,
    `Desktop/None`,
  ]);
};

export const withVariantMethodPhone = (Component: any): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => [
    `Phone/${store.method}`,
    `Phone/None`,
  ]);
};

export const withVariantRecipientDesktop = (Component: any): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => [
    `Desktop/${store.recipient}`,
    `Desktop/None`,
  ]);
};

export const withVariantRecipientPhone = (Component: any): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => [
    `Phone/${store.recipient}`,
    `Phone/None`,
  ]);
};

export const withVariantTaxDeductibleDesktop = (
  Component: any
): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => [
    `Desktop/${store.taxDeductible ? "Checked" : "Empty"}`,
    `Desktop/Empty`,
  ]);
};

export const withVariantTaxDeductiblePhone = (
  Component: any
): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => [
    `Phone/${store.taxDeductible ? "Checked" : "Empty"}`,
    `Phone/Empty`,
  ]);
};

export const withVariantRulesAcceptedDesktop = (
  Component: any
): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => [
    `Desktop/${store.rulesAccepted ? "Checked" : "Empty"}`,
    `Desktop/Empty`,
  ]);
};

export const withVariantRulesAcceptedPhone = (
  Component: any
): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => [
    `Phone/${store.rulesAccepted ? "Checked" : "Empty"}`,
    `Phone/Empty`,
  ]);
};

export const withVariantSubscribeToNewsletterDesktop = (
  Component: any
): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => [
    `Desktop/${store.subscribeToNewsletter ? "Checked" : "Empty"}`,
    `Desktop/Empty`,
  ]);
};

export const withVariantSubscribeToNewsletterPhone = (
  Component: any
): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => [
    `Phone/${store.subscribeToNewsletter ? "Checked" : "Empty"}`,
    `Phone/Empty`,
  ]);
};

export const withVariantStepDesktop = (Component: any): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => {
    useEffect(() => setStore({ env: "prod" }), []);
    return [`Desktop/${store.step}`, `Desktop/Step 1`];
  });
};

export const withVariantStepPhone = (Component: any): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => {
    useEffect(() => setStore({ env: "prod" }), []);
    return [`Phone/${store.step}`, `Phone/Step 1`];
  });
};

export const withVariantStepDesktopDev = (Component: any): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => {
    useEffect(() => setStore({ env: "dev" }), []);
    return [`Desktop/${store.step}`, `Desktop/Step 1`];
  });
};

export const withVariantStepPhoneDev = (Component: any): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => {
    useEffect(() => setStore({ env: "dev" }), []);
    return [`Phone/${store.step}`, `Phone/Step 1`];
  });
};

// Debug

export const showDebug = (Component: any): ComponentType => {
  return (props) => {
    const [store] = useStore();

    return store.env === "prod" ? null : (
      <Component
        {...props}
        text={`${JSON.stringify(prepareDonationPayload(store), null, 4)}`}
      />
    );
  };
};

// Helpers

const querySelector = (selector: string) => {
  return window?.document?.querySelector(selector);
};
