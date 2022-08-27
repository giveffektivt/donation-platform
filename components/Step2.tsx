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
            E-mail
            <span className="weight-normal"> (til kvittering, ikke spam)</span>
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
            <span>Jeg accepterer</span>{" "}
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
