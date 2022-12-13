import { Button, CprInput, GEFrame, Input } from "comps";
import { Formik } from "formik";
import { DonationRecipient } from "src/donation/types";
import { submitForm, validationSchema } from "src/helpers";
import * as yup from "yup";

const errorMessage = `
Der opstod en serverfejl. Prøv venligst igen. Skriv til os på donation@giveffektivt.dk \
hvis problemet opstår igen. Hvis muligt, så fortæl gerne, hvordan \
man kan fremprovokere fejlen.
`;

const validation = {
  name: validationSchema.name,
  tin: validationSchema.tin,
  email: validationSchema.email,
  address: validationSchema.address,
  zip: validationSchema.zip,
  city: validationSchema.city,
};

export const Membership = () => {
  const initialValues = {
    name: "",
    email: "",
    address: "",
    zip: "",
    city: "",
    country: "Denmark",
    tin: "",
    membership: true,
    method: "creditCard",

    // HACK: unused "required" fields,
    // not to make all of those optional in validation schema if we are not going to keep this for long time
    amount: 1,
    recipient: DonationRecipient.GivEffektivt,
    subscription: "oneTime",
    taxDeduction: false,
  };

  const handleSubmit = async (values: any, bag: any) => {
    try {
      bag.setTouched({});
      await submitForm(values, bag);
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
      validationSchema={yup.object().shape(validation)}
    >
      {(props) => (
        <GEFrame text="Bliv medlem af Giv Effektivt">
          <form onSubmit={props.handleSubmit}>
            <div style={{ lineHeight: "1.5" }}>
              Bliv medlem for 50 kr. om året og hjælp med at gøre donationer til
              Giv Effektivt fradragsberettigede.{" "}
              <a
                target={"_blank"}
                rel="noreferrer"
                href="https://giveffektivt.dk/medlemskab/"
              >
                Læs mere her.
              </a>
            </div>

            <Input
              label="Fuldt navn"
              name="name"
              type="text"
              style={{ maxWidth: "32rem" }}
            />

            <CprInput
              label={
                <>
                  CPR-nr.
                  <span className="weight-normal">
                    {" "}
                    (bruges kun når medlemslisten indrapporteres til SKAT)
                  </span>
                </>
              }
              name="tin"
              type="text"
              style={{ maxWidth: "14rem" }}
            />

            <Input
              label={
                <>
                  Email
                  <span className="weight-normal">
                    {" "}
                    (til kvittering, ikke spam)
                  </span>
                </>
              }
              name="email"
              type="text"
              style={{ maxWidth: "32rem" }}
            />

            <Input
              label={<>Adresse</>}
              name="address"
              type="text"
              style={{ maxWidth: "32rem" }}
            />

            <Input
              label={<>Postnummer</>}
              name="zip"
              type="number"
              style={{ maxWidth: "7rem" }}
            />

            <Input
              label={<>By</>}
              name="city"
              type="text"
              style={{ maxWidth: "16rem" }}
            />

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
