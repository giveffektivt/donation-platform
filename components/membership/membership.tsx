import { Button, GEFrame, Input } from "comps";
import { CprInput } from "./CprInput";
import { Address } from "./Address";
import { Formik } from "formik";
import { submitForm, validationSchemaMembership } from "src/helpers";
import * as yup from "yup";

const errorMessage = `
Der opstod en serverfejl. Prøv venligst igen. Skriv til os på donation@giveffektivt.dk \
hvis problemet opstår igen. Hvis muligt, så fortæl gerne, hvordan \
man kan fremprovokere fejlen.
`;

export const Membership = () => {
  const initialValues = {
    name: "",
    tin: "",
    email: "",
    address: "",
    postcode: "",
    city: "",
  };

  const handleSubmit = async (values: any, bag: any) => {
    try {
      bag.setTouched({});
      await submitForm("membership", values, bag);
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
      validationSchema={yup.object().shape(validationSchemaMembership)}
    >
      {(props) => (
        <GEFrame
          text="Bliv medlem af Giv Effektivt"
          className="membership-form"
        >
          <form onSubmit={props.handleSubmit}>
            <Input
              label="Fuldt navn"
              name="name"
              type="text"
              className="full-width form-input"
            />

            <CprInput
              label={
                <>
                  CPR-nr.
                  <span className="weight-normal">
                    {" "}
                    (bruges af Skatteforvaltningen)
                  </span>
                </>
              }
              name="tin"
              type="text"
              className="full-width form-input"
            />

            <Input
              label={
                <>
                  Email
                  <span className="weight-normal"> (til kvittering)</span>
                </>
              }
              name="email"
              type="text"
              className="full-width form-input"
            />

            <Address />

            <Button type="submit">
              <div style={{ display: "flex", alignItems: "center" }}>
                <span>Betal 50 kr.</span>
              </div>
            </Button>
          </form>
        </GEFrame>
      )}
    </Formik>
  );
};
