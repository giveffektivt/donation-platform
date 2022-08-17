import { Button, Checkbox, Input, PaymentMethodRadio } from "comps";
import { useFormikContext } from "formik";
import Image from "next/image";
import info from "public/info.png";
import { FormikData } from "src";

export const Step3 = () => {
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
          <span>Gå til betaling</span>
        </div>
      </Button>

      {formik.values.method === "creditCard" && (
        <div
          className="form-group"
          style={{ display: "flex", gap: "10px", alignItems: "center" }}
        >
          <div style={{ margin: "0 0px 0 auto" }}>
            <Image
              src={info}
              width={"100px"}
              height={"100px"}
              quality="100"
              alt="Info"
            />
          </div>

          <div>
            OBS: Fortsæt bare selvom der står 0 kr. hvis du skal bekræfte med
            NEM-ID. Den forkerte visning i NEM-ID udbedres snarest.
          </div>
        </div>
      )}
    </>
  );
};
