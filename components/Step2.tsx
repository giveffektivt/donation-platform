import { Button, Checkbox, Input, PaymentMethodRadio } from "comps";
import { useFormikContext } from "formik";
import { FormikData } from "src";

export const Step2 = () => {
  const formik = useFormikContext<FormikData>();

  return (
    <>
      <Input
        label={
          <>
            Email
            <span className="weight-normal"> (til kvittering)</span>
          </>
        }
        name="email"
        type="text"
        style={{ maxWidth: "32rem" }}
      />

      <PaymentMethodRadio />

      <Checkbox
        name="rulesAccepted"
        checkboxLabel={
          <>
            Jeg accepterer{" "}
            <a
              href="https://giveffektivt.dk/handelsbetingelser/"
              target={"_blank"}
              rel="noreferrer"
            >
              handelsbetingelserne
            </a>
          </>
        }
      />

      <Checkbox
        name="subscribeToNewsletter"
        className="form-group-no-margin"
        checkboxLabel={
          <>
            <span className="unbreakable-line">Tilmeld mig nyghedsbrevet</span>{" "}
            <span className="unbreakable-line">(4-6 emails om året)</span>
          </>
        }
      />

      <Button type="submit" disabled={formik.isSubmitting}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span>
            Donér {formik.values.amount} kr. til {formik.values.recipient}
          </span>
        </div>
      </Button>
    </>
  );
};
