import {
  BankTransferStep,
  MembershipStep,
  Step1,
  Step3,
  Wizard,
  WizardStep,
} from "comps";
import type { NextPage } from "next";
import { submitForm, validationSchema } from "src/helpers";
import * as Yup from "yup";

const initialValues = {
  amount: "",
  recipient: "GiveWell Maximum Impact Fund",
  subscription: "",
  name: "",
  email: "",
  method: "",
  tin: "",
  membership: false,
  membershipOnly: false,
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
            membership: validationSchema.membership,
            name: validationSchema.name,
            address: validationSchema.address,
            zip: validationSchema.zip,
            city: validationSchema.city,
            tin: validationSchema.tin,
          })}
        >
          <MembershipStep />
        </WizardStep>
        <WizardStep
          validationSchema={Yup.object().shape({
            email: validationSchema.email,
            method: validationSchema.method,
            rulesAccepted: validationSchema.rulesAccepted,
          })}
        >
          <Step3 />
        </WizardStep>
        <WizardStep>
          <BankTransferStep />
        </WizardStep>
      </Wizard>
    </>
  );
};

export default Home;
