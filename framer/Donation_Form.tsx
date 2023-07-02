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
      const element = document.querySelector(`.${props.className}`);
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

const preselectRecipient = (
  Component: any,
  preselectedRecipient: string
): ComponentType => {
  return (props) => {
    const [_, setStore] = useStore();
    const onTap = () => setStore({ preselectedRecipient });
    return <Component {...props} onTap={onTap} />;
  };
};

export const preselectRecipientGivEffektivtsAnbefaling = (
  Component: any
): ComponentType => {
  return preselectRecipient(Component, "Giv Effektivts anbefaling");
};

export const preselectRecipientMyggenetModMalaria = (
  Component: any
): ComponentType => {
  return preselectRecipient(Component, "Myggenet mod malaria");
};

export const preselectRecipientMedicinModMalaria = (
  Component: any
): ComponentType => {
  return preselectRecipient(Component, "Medicin mod malaria");
};

export const preselectRecipientVitaminModMangelsygdomme = (
  Component: any
): ComponentType => {
  return preselectRecipient(Component, "Vitamin mod mangelsygdomme");
};

export const preselectRecipientVaccinerTilSpædbørn = (
  Component: any
): ComponentType => {
  return preselectRecipient(Component, "Vacciner til spædbørn");
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

const withRecipient = (Component: any, init: any): ComponentType => {
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

export const withVariantAmount = (Component: any): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => {
    const frequency = parseFrequency(store.frequency);
    return [`${frequency}/${store.amount}`, `${frequency}/None`];
  });
};

export const withVariantFrequency = (Component: any): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => [
    `${store.frequency}`,
  ]);
};

export const withVariantMethod = (Component: any): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => [
    `${store.method}`,
    `None`,
  ]);
};

export const withVariantRecipient = (Component: any): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => [
    `${store.recipient}`,
  ]);
};

export const withVariantTaxDeductible = (Component: any): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => [
    `${store.taxDeductible ? "Checked" : "Empty"}`,
    `Empty`,
  ]);
};

export const withVariantRulesAccepted = (Component: any): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => [
    `${store.rulesAccepted ? "Checked" : "Empty"}`,
    `Empty`,
  ]);
};

export const withVariantSubscribeToNewsletter = (
  Component: any
): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => [
    `${store.subscribeToNewsletter ? "Checked" : "Empty"}`,
    `Empty`,
  ]);
};

export const withVariantStepDesktop = (Component: any): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => {
    useEffect(() => {
      setStore({ env: location.host === "giveffektivt.dk" ? "prod" : "dev" });
    }, []);
    return [`Desktop/${store.step}`, `Desktop/Step 1`];
  });
};

export const withVariantStepPhone = (Component: any): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => {
    useEffect(() => {
      setStore({ env: location.host === "giveffektivt.dk" ? "prod" : "dev" });
    }, []);
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
