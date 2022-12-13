import { GEFrame } from "comps";
import { MembershipStep1 } from "comps/membership";
import { Formik } from "formik";
import { useState } from "react";
import { DonationRecipient } from "src/donation/types";
import { submitForm, validationSchema } from "src/helpers";
import * as yup from "yup";

const errorMessage = `
Der opstod en serverfejl. Prøv venligst igen. Skriv til os på donation@giveffektivt.dk \
hvis problemet opstår igen. Hvis muligt, så fortæl gerne, hvordan \
man kan fremprovokere fejlen.
`;

const validateStep1 = {
  name: validationSchema.name,
  tin: validationSchema.tin,
  email: validationSchema.email,
  address: validationSchema.address,
  zip: validationSchema.zip,
  city: validationSchema.city,
};

export const Membership = () => {
  const initialValues = {
    name: "",
    email: "",
    address: "",
    zip: "",
    city: "",
    country: "Denmark",
    tin: "",
    membership: true,
    method: "creditCard",

    // HACK: unused "required" fields,
    // not to make all of those optional in validation schema if we are not going to keep this for long time
    amount: 1,
    recipient: DonationRecipient.GivEffektivt,
    subscription: "oneTime",
    taxDeduction: false,
  };

  const [step, setStep] = useState(0);

  const steps = [<MembershipStep1 key={0} />];
  const maxStep = steps.length;

  const validations = [validateStep1];

  const handleSubmit = async (values: any, bag: any) => {
    try {
      bag.setTouched({});
      switch (step) {
        case 0:
          await submitForm(values, bag);
          break;
      }
    } catch (err) {
      alert(errorMessage);
      console.error(err);

      try {
        const response = await fetch("/api/reportError", { method: "POST" });
        if (!response.ok) {
          throw new Error("Unable to submit report about the critical error");
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <Formik
      onSubmit={handleSubmit}
      initialValues={initialValues}
      validationSchema={yup.object().shape(validations[step])}
    >
      {(props) => (
        <GEFrame
          text="Bliv medlem af Giv Effektivt"
          maxStep={maxStep}
          currentStep={step}
        >
          <form onSubmit={props.handleSubmit}>{steps[step]}</form>
        </GEFrame>
      )}
    </Formik>
  );
};
