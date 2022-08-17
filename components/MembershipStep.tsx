import { Input, Button, Checkbox, CprInput } from "comps";
import { useFormikContext } from "formik";

export const MembershipStep = () => {
  const formik = useFormikContext<any>();
  return (
    <>
      <Checkbox
        name="membership"
        labelPadding={false}
        checkboxLabel={
          <>
            Bliv medlem for 50 kr. om året og hjælp med at gøre donationer til
            Giv Effektivt fradragsberettigede.{" "}
            <a
              target={"_blank"}
              rel="noreferrer"
              href="https://giveffektivt.dk/medlemskab/"
            >
              {" "}
              Læs mere her.
            </a>
          </>
        }
      />

      {formik.values.membership ? (
        <>
          <Input
            label="Fuldt navn"
            name="name"
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
          {!formik.values.taxDeduction && (
            <CprInput
              label={<>CPR-nr.</>}
              name="tin"
              type="text"
              style={{ maxWidth: "14rem" }}
            />
          )}
        </>
      ) : null}

      <Button type="submit">
        <div style={{ display: "flex", alignItems: "center" }}>
          <span>Vælg betalingsmiddel</span>
        </div>
      </Button>
    </>
  );
};
