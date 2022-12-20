import { BankTransferStep, Step1, Step2, Wizard, WizardStep } from "comps";
import type { NextPage } from "next";
import { DonationRecipient } from "src/donation/types";
import { validationSchemaDonation } from "src/helpers";
import * as Yup from "yup";

const initialValues = {
  amount: "",
  visibleAmount: "",
  recipient: DonationRecipient.GivEffektivtsAnbefaling,
  frequency: "",
  taxDeduction: false,
  tin: "",
  email: "",
  method: "",
  rulesAccepted: false,
  subscribeToNewsletter: false,
  bank: {},
};

const { amount, recipient, frequency, taxDeductible, tin, ...validationStep2 } =
  validationSchemaDonation;

const validationStep1 = { amount, recipient, frequency, taxDeductible, tin };

const Home: NextPage = () => {
  return (
    <>
      <Wizard initialValues={initialValues}>
        <WizardStep
          validationSchemaDonation={Yup.object().shape(validationStep1)}
        >
          <Step1 />
        </WizardStep>
        <WizardStep validationSchema={Yup.object().shape(validationStep2)}>
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
