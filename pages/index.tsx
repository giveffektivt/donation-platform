import { BankTransferStep, Step1, Step2, Wizard, WizardStep } from "comps";
import type { NextPage } from "next";
import { DonationRecipient } from "src/donation/types";
import { submitForm, validationSchemaDonation } from "src/helpers";
import * as Yup from "yup";

const initialValues = {
  amount: "",
  visibleAmount: "",
  recipient: DonationRecipient.GivEffektivtsAnbefaling,
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
  subscribeToNewsletter: false,
  taxDeduction: false,
  bank: {},
};

const Home: NextPage = () => {
  return (
    <>
      <Wizard initialValues={initialValues}>
        <WizardStep
          validationSchemaDonation={Yup.object().shape({
            amount: validationSchemaDonation.amount,
            subscription: validationSchemaDonation.subscription,
            recipient: validationSchemaDonation.recipient,
            tin: validationSchemaDonation.tin,
          })}
        >
          <Step1 />
        </WizardStep>
        <WizardStep
          validationSchema={Yup.object().shape({
            email: validationSchemaDonation.email,
            method: validationSchemaDonation.method,
            rulesAccepted: validationSchemaDonation.rulesAccepted,
            subscribeToNewsletter:
              validationSchemaDonation.subscribeToNewsletter,
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
