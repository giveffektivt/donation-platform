const prepareNewsletterPayload = (store: any) => ({ email: store.email });

const submitNewsletter = async (store: any, setStore: any) => {
  try {
    setStore({ isLoading: true, isSubscribed: false, isFailed: false });
    track("Newsletter form submitted", 20);

    await submitForm(store.env, "newsletter", prepareNewsletterPayload(store));
    setStore({ isSubscribed: true });
    setTimeout(() => setStore({ email: "" }), 5000);
  } catch (err) {
    setStore({ isFailed: true });
    notifyAboutClientSideError("submitNewsletter", err?.toString());
  }

  setStore({ isLoading: false });
  setTimeout(() => setStore({ isSubscribed: false, isFailed: false }), 5000);
};
