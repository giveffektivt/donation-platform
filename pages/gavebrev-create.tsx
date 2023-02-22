import { Button, CprInput, GEFrame, Input } from "comps";
import { InvisibleInput } from "comps/gavebrev";
import { Formik, useField } from "formik";
import { NextPage } from "next";
import { validationSchemaGavebrev } from "src/helpers";
import * as yup from "yup";

type GavebrevValues = {
  name: string;
  tin: string;
  email: string;
  startYear: number;
  percentage: string;
  amount: string;
  minimalIncome: string;
  token: string;
  errors: string;
  onlyPercentageOrAmount: string;
  eitherPercentageOrAmount: string;
  agreementId: string;
};

const gavebrev: NextPage = () => {
  const initialValues: GavebrevValues = {
    token: "",
    name: "",
    tin: "",
    email: "",
    startYear: new Date().getFullYear(),
    percentage: "",
    amount: "",
    minimalIncome: "",
    errors: "",
    onlyPercentageOrAmount: "",
    eitherPercentageOrAmount: "",
    agreementId: "",
  };

  const handleSubmit = async (values: GavebrevValues, bag: any) => {
    bag.setTouched({});

    values.errors = "";
    values.agreementId = "";

    try {
      const response = await fetch("/api/gavebrev", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + values.token,
        },
        body: prepareBody(values),
      });
      if (response.ok) {
        const data = await response.json();
        values.agreementId = data.agreementId;
      } else {
        throw new Error(await response.text());
      }
    } catch (e: any) {
      values.errors = e.toString();
    }
  };

  return (
    <Formik
      onSubmit={handleSubmit}
      initialValues={initialValues}
      validationSchema={yup.object().shape(validationSchemaGavebrev)}
    >
      {(props) => (
        <GEFrame text="Opret Gavebrev">
          <form onSubmit={props.handleSubmit}>
            <Input
              label="Adgangskode"
              name="token"
              type="password"
              className="full-width form-input"
            />

            <Input
              label="Fuldt navn"
              name="name"
              type="text"
              className="full-width form-input"
            />

            <CprInput
              label="CPR-nr."
              name="tin"
              type="text"
              className="full-width form-input"
            />

            <Input
              label="Email"
              name="email"
              type="text"
              className="full-width form-input"
            />

            <Input
              label="Start år"
              name="startYear"
              type="text"
              className="full-width form-input"
            />

            <Input
              label="Enten procent af årsindkomst"
              name="percentage"
              type="text"
              className="full-width form-input"
            />

            <Input
              label="Eller beløb om året"
              name="amount"
              type="text"
              className="full-width form-input"
            />

            <Input
              label="Minimal årsindkomst"
              name="minimalIncome"
              type="text"
              className="full-width form-input"
            />

            <InvisibleInput
              label="Serverfejl"
              name="errors"
              type="text"
              className="full-width form-input"
            />

            <InvisibleInput
              label="Validationsfejl"
              name="onlyPercentageOrAmount"
              type="text"
              className="full-width form-input"
            />

            <InvisibleInput
              label="Validationsfejl"
              name="eitherPercentageOrAmount"
              type="text"
              className="full-width form-input"
            />

            <InvisibleInput
              label="Aftalens ID"
              name="agreementId"
              type="text"
              className="full-width form-input"
            />

            <Button type="submit">
              <div style={{ display: "flex", alignItems: "center" }}>
                <span>Godkend og få aftalens ID</span>
              </div>
            </Button>
          </form>
        </GEFrame>
      )}
    </Formik>
  );
};

function prepareBody(values: GavebrevValues) {
  const unfilteredBody: any = (({
    name,
    tin,
    email,
    startYear,
    percentage,
    amount,
    minimalIncome,
  }) => ({
    name,
    tin,
    email,
    startYear,
    percentage,
    amount,
    minimalIncome,
  }))(values);

  const body = Object.keys(unfilteredBody).reduce((result: any, key) => {
    if (unfilteredBody[key]) {
      result[key] = unfilteredBody[key];
    }
    return result;
  }, {});

  return JSON.stringify(body);
}

export default gavebrev;
