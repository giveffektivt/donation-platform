import { BankTransferStep, Step1, Step2, Wizard, WizardStep } from "comps";
import type { NextPage } from "next";
import { submitForm, validationSchema } from "src/helpers";
import { DonationRecipient } from "src/donation/types";
import * as Yup from "yup";

const initialValues = {
  amount: "",
  recipient: DonationRecipient.VoresAnbefaling,
  subscription: "",
  name: "",
  email: "",
  method: "",
  tin: "",
  membership: false,
  address: "",
  zip: "",
  city: "",
  country: "Denmark",
  rulesAccepted: false,
  taxDeduction: false,
  bank: {},
};

const Home: NextPage = () => {
  return (
    <>
      <Wizard initialValues={initialValues} onSubmit={submitForm}>
        <WizardStep
          validationSchema={Yup.object().shape({
            amount: validationSchema.amount,
            subscription: validationSchema.subscription,
            recipient: validationSchema.recipient,
            tin: validationSchema.tin,
          })}
        >
          <Step1 />
        </WizardStep>
        <WizardStep
          validationSchema={Yup.object().shape({
            email: validationSchema.email,
            method: validationSchema.method,
            rulesAccepted: validationSchema.rulesAccepted,
          })}
        >
          <Step2 />
        </WizardStep>
        <WizardStep>
          <BankTransferStep />
        </WizardStep>
      </Wizard>
    </>
  );
};

export default Home;
