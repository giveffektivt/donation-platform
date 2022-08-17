import { GEFrame } from "comps";
import { MembershipEnStep1, MembershipEnStep2 } from "comps/membershipEn";
import { Formik } from "formik";
import { useState } from "react";
import { validationSchema, submitForm, validationSchemaEn } from "src/helpers";
import * as yup from "yup";

const errorMessage = `
Der opstod en serverfejl. Prøv venligst igen. Skriv til os på donation@giveffektivt.dk \
hvis problemet opstår igen. Hvis muligt, så fortæl gerne, hvordan \
man kan fremprovokere fejlen.
`;

//TODO

const validateStep1 = {
  name: validationSchemaEn.name,
  tin: validationSchemaEn.tin,
  birthday: validationSchemaEn.birthday,
  email: validationSchemaEn.email,
};

// TODO

const validateStep2 = {
  address: validationSchemaEn.address,
  zip: validationSchemaEn.zip,
  city: validationSchemaEn.city,
  country: validationSchemaEn.country,
};

export const MembershipEn = () => {
  const initialValues = {
    name: "",
    email: "",
    address: "",
    zip: "",
    city: "",
    birthday: "1985-01-01",
    tin: "",
    country: "",
  };

  const [step, setStep] = useState(0);
  const handlePrevious = () => {
    setStep((step) => step - 1);
  };

  // I have no idea what are the keys used to
  const steps = [
    <MembershipEnStep1 key={0} />,
    <MembershipEnStep2 handlePrevious={handlePrevious} key={1} />,
  ];
  const maxStep = steps.length;

  const validations = [validateStep1, validateStep2];

  const handleSubmit = async (values: any, bag: any) => {
    try {
      bag.setTouched({});
      switch (step) {
        case 0:
          setStep((step) => step + 1);
          break;
        case 1:
          await submitForm(values, bag, "/api/payment-en");
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
          text="Become a member of Giv Effektivt"
          maxStep={maxStep}
          currentStep={step}
        >
          <form onSubmit={props.handleSubmit}>{steps[step]}</form>
        </GEFrame>
      )}
    </Formik>
  );
};
