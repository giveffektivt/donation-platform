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
  recipient: "Giv Effektivts anbefaling",
  rulesAccepted: false,
  subscribeToNewsletter: false,
  taxDeductible: false,
  bank: {},
  bankMessage: "",
  bankAccount: "",
  env: "prod",
  step: "Step 1",
  isLoading: false,
  fundraiserId: null,
  fundraiserName: null,
  fundraiserHasMatch: false,
  fundraiserMatchCurrency: null,
  message: null,
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
      setStore({
        [field]: field === "amount" ? parseFormatAmount(value) : value,
      });
    };

    return <Component {...props} onTap={onTap} />;
  };
};

export const trackSubmitStep1 = (Component: any): ComponentType => {
  return (props) => {
    const onTap = async () => track("Donation form step 1 submitted", 10);
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

export const trackStotNu = (Component: any): ComponentType => {
  return (props) => {
    const onTap = async () => track("Støt nu clicked", 5);
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

    const onValueChange = (amount: string) => setStore({ amount });

    const frequency = parseFrequency(store.frequency);

    return (
      <Component
        {...props}
        value={store.amount}
        placeholder={frequency === "match" ? "0,1" : "0"}
        onValueChange={onValueChange}
      />
    );
  };
};

export const showDonateAmount = (Component: any): ComponentType => {
  return (props) => {
    const [store] = useStore();
    const amount = parseFormatAmount(store.amount);
    const frequency = parseFrequency(store.frequency);
    const currency =
      frequency === "match"
        ? (store.fundraiserMatchCurrency ?? "kr.")
        : frequency === "monthly"
          ? "kr. pr. md."
          : "kr.";
    return <Component {...props} title={`Donér ${amount} ${currency}`} />;
  };
};

export const showCurrency = (Component: any): ComponentType => {
  return (props) => {
    const [store] = useStore();
    const frequency = parseFrequency(store.frequency);
    const currency =
      frequency === "match" ? (store.fundraiserMatchCurrency ?? "kr.") : "kr.";
    return <Component {...props} text={`${currency}`} />;
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

      if (tin.length === 10) {
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
      const recipient = parseRecipient(store.recipient);
      const idx = Math.max(0, findRecipientIndex(props.options, recipient));
      const frequency = parseFrequency(store.frequency);
      const method = parseMethod(store.method);

      setIndex(idx);

      if (recipient === "Giv Effektivts arbejde og vækst") {
        if (frequency === "match" && method !== "Bank transfer") {
          setStore({ method: "Bank" }); // Variant name
        } else if (store.method === "MobilePay") {
          setStore({ method: "" });
        }
      }
    }, [
      props.options,
      store.recipient,
      store.method,
      store.frequency,
      setStore,
    ]);

    const onChange = (idx: number) => {
      setStore({ recipient: props.options[idx] });
    };

    return <Component {...props} value={index + 1} onChange={onChange} />;
  };
};

const withRecipient = (Component: any, init: any): ComponentType => {
  return (props) => {
    const [_, setStore] = useStore();
    useEffect(() => init(setStore), [init, setStore]);
    return <Component {...props} />;
  };
};

export const withRecipientGivEffektivtsAnbefaling = (
  Component: any,
): ComponentType => {
  return withRecipient(Component, (setStore) =>
    setStore({ recipient: "Giv Effektivts anbefaling" }),
  );
};

export const withRecipientMyggenetModMalaria = (
  Component: any,
): ComponentType => {
  return withRecipient(Component, (setStore) =>
    setStore({ recipient: "Myggenet mod malaria" }),
  );
};

export const withRecipientMedicinModMalaria = (
  Component: any,
): ComponentType => {
  return withRecipient(Component, (setStore) =>
    setStore({ recipient: "Medicin mod malaria" }),
  );
};

export const withRecipientVitaminModMangelsygdomme = (
  Component: any,
): ComponentType => {
  return withRecipient(Component, (setStore) =>
    setStore({ recipient: "Vitamin mod mangelsygdomme" }),
  );
};

export const withRecipientVaccinerTilSpædbørn = (
  Component: any,
): ComponentType => {
  return withRecipient(Component, (setStore) =>
    setStore({ recipient: "Vacciner til spædbørn" }),
  );
};

export const withRecipientKontantoverførslerTilVerdensFattigste = (
  Component: any,
): ComponentType => {
  return withRecipient(Component, (setStore) =>
    setStore({
      recipient: "Kontantoverførsler til verdens fattigste",
    }),
  );
};

export const withRecipientGivEffektivtsArbejdeOgVækst = (
  Component: any,
): ComponentType => {
  return withRecipient(Component, (setStore) =>
    setStore({
      recipient: "Giv Effektivts arbejde og vækst",
    }),
  );
};

// Show summary + bank

export const showAmount = (Component: any): ComponentType => {
  return (props) => {
    const [store] = useStore();
    const amount = parseFormatAmount(store.amount);
    return <Component {...props} text={`${amount} kr.`} />;
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
    const amount = parseFormatAmount(store.amount);
    return [`${frequency}/${amount} kr`, `${frequency}/None`];
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
    "None",
  ]);
};

export const withVariantMethodPhone = (Component: any): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => [
    `Phone/${store.method}`,
    "Phone/None",
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
    "Empty",
  ]);
};

export const withVariantRulesAccepted = (Component: any): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => [
    `${store.rulesAccepted ? "Checked" : "Empty"}`,
    "Empty",
  ]);
};

export const withVariantSubscribeToNewsletter = (
  Component: any,
): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => [
    `${store.subscribeToNewsletter ? "Checked" : "Empty"}`,
    "Empty",
  ]);
};

export const withVariantStepDesktop = (Component: any): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => {
    useEffect(() => {
      setStore({
        env: location.host === "giveffektivt.dk" ? "prod" : "dev",
      });
    }, [setStore]);
    return [`Desktop/${store.step}`, `Desktop/Step 1`];
  });
};

export const withVariantStepPhone = (Component: any): ComponentType => {
  return withVariant(Component, (store: any, setStore: any) => {
    useEffect(() => {
      setStore({
        env: location.host === "giveffektivt.dk" ? "prod" : "dev",
      });
    }, [setStore]);
    return [`Phone/${store.step}`, "Phone/Step 1"];
  });
};

export const showCprCvrWarning = (Component: any): ComponentType => {
  return (props) => {
    const [store] = useStore();

    const isCprCvrSuspicious =
      store.taxDeductible &&
      isCprCvrValid(store.taxDeductible, store.tin) &&
      !isCprCvrPlausible(store.tin);

    return isCprCvrSuspicious ? <Component {...props} /> : null;
  };
};

export const showCpr = (Component: any): ComponentType => {
  return (props) => {
    const [store] = useStore();
    return <Component {...props} text={`${store.tin}`} />;
  };
};

// Fundraiser

export const withFundraiser = (Component: any): ComponentType => {
  return (props: any) => {
    const [store, setStore] = useStore();

    useEffect(() => {
      setStore({ frequency: "Giv en gang" });

      const request = async () => {
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

        setStore({ fundraiserId: id });

        const response = await fetch(apiUrl("prod", `fundraiser/${id}`));

        if (!response.ok) {
          throw new Error(`${response.status}`);
        }

        const body = await response.json();
        setStore({
          fundraiserName: body.title,
          frequency: body.has_match ? "Match" : "Giv en gang",
          fundraiserHasMatch: body.has_match ?? false,
          fundraiserMatchCurrency: body.match_currency ?? null,
        });
      };

      request().catch((err: Error) => {
        notifyAboutClientSideError("donation withFundraiser", err?.toString());
      });
    }, [setStore]);

    return <Component {...props} />;
  };
};

export const showFundraiser = (Component: any): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    return store.fundraiserId ? <Component {...props} /> : null;
  };
};

export const showNoFundraiser = (Component: any): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    return store.fundraiserId ? null : <Component {...props} />;
  };
};

export const showHasMatch = (Component: any): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    return store.fundraiserHasMatch ? <Component {...props} /> : null;
  };
};

export const showHasNoMatch = (Component: any): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    return store.fundraiserHasMatch ? null : <Component {...props} />;
  };
};

export const showMatchAndToCharities = (Component: any): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    const frequency = parseFrequency(store.frequency);
    const isToCharities =
      parseRecipient(store.recipient) !== "Giv Effektivts arbejde og vækst";
    return frequency === "match" && isToCharities ? (
      <Component {...props} />
    ) : null;
  };
};

export const showNoMatch = (Component: any): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    const frequency = parseFrequency(store.frequency);
    return frequency === "match" ? null : <Component {...props} />;
  };
};

export const showDonatingToCharities = (Component: any): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    const isToCharities =
      parseRecipient(store.recipient) !== "Giv Effektivts arbejde og vækst";
    return isToCharities ? <Component {...props} /> : null;
  };
};

export const showDonatingToOurWork = (Component: any): ComponentType => {
  return (props: any) => {
    const [store] = useStore();
    const isToOurWork =
      parseRecipient(store.recipient) === "Giv Effektivts arbejde og vækst";
    return isToOurWork ? <Component {...props} /> : null;
  };
};

export const showFundraiserName = (Component: any): ComponentType => {
  return (props) => {
    const [store] = useStore();
    return store.fundraiserName ? (
      <Component {...props} text={`Indsamling: ${store.fundraiserName}`} />
    ) : null;
  };
};

export const showNearNewYear = (Component: any): ComponentType => {
  return (props: any) => {
    const now = new Date();
    const newYear = new Date(now.getFullYear() + 1, 0, 1);
    const daysUntilNewYear = (newYear - now) / (1000 * 60 * 60 * 24);
    return daysUntilNewYear > 7 ? null : <Component {...props} />;
  };
};

export const inputMessage = (Component: any): ComponentType => {
  return (props: any) => {
    const [store, setStore] = useStore();

    const onValueChange = (message: string) => setStore({ message });

    return (
      <Component
        {...props}
        value={store.message ?? ""}
        onValueChange={onValueChange}
      />
    );
  };
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
