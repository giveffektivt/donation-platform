import { BankTransferStep, Step1, Step2, Wizard, WizardStep } from "comps";
import type { NextPage } from "next";
import { DonationRecipient } from "src/donation/types";
import { validationSchemaDonation } from "src/helpers";
import * as Yup from "yup";

const initialValues = {
  amount: "",
  visibleAmount: "",
  recipient: DonationRecipient.GivEffektivtsAnbefaling,
  subscription: "",
  taxDeduction: false,
  tin: "",
  email: "",
  method: "",
  rulesAccepted: false,
  subscribeToNewsletter: false,
  bank: {},
};

const Home: NextPage = () => {
  return (
    <>
      <Wizard initialValues={initialValues}>
        <WizardStep
          validationSchemaDonation={Yup.object().shape({
            amount: validationSchemaDonation.amount,
            recipient: validationSchemaDonation.recipient,
            subscription: validationSchemaDonation.subscription,
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
