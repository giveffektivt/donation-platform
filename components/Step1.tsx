import {
  AmountInput,
  Button,
  Checkbox,
  CprInput,
  FrequencyRadio,
  Select,
} from "comps";
import { useFormikContext } from "formik";

export const Step1 = () => {
  const formik = useFormikContext<any>();

  // Reset payment method in case user selected MobilePay, clicked back and now wants to pick monthly donation
  formik.values.method = "";

  return (
    <>
      <AmountInput
        label={<>Beløb i DKK</>}
        name="amount"
        type="number"
        placeholder="Andet"
        style={{ maxWidth: "8rem", marginTop: 0 }}
      />

      <Select
        label="Hvem vil du støtte?"
        name="recipient"
        helper={
          <>
            Læs mere om disse ekstraordinært effektive velgørende organisationer{" "}
            <a
              href="https://giveffektivt.dk/bedste-organisationer/"
              target="_blank"
              rel="noreferrer"
            >
              her.
            </a>{" "}
          </>
        }
      >
        <option value="GiveWell Maximum Impact Fund" key={1}>
          {"GiveWell Maximum Impact Fund (vores anbefaling)"}
        </option>
        <option value="GiveWell All Grants Fund">
          GiveWell All Grants Fund
        </option>
        <option value="Against Malaria Foundation">
          Against Malaria Foundation
        </option>
        <option value="Malaria Consortium">Malaria Consortium</option>
        <option value="Helen Keller International">
          Helen Keller International
        </option>
        <option value="New Incentives">New Incentives</option>
      </Select>

      <FrequencyRadio />
      <Checkbox
        name="taxDeduction"
        checkboxLabel={
          <>
            Få skattefradrag.{" "}
            <a
              target={"_blank"}
              rel="noreferrer"
              href="https://giveffektivt.dk/fradrag/"
            >
              Læs mere her.
            </a>
          </>
        }
      />

      {formik.values.taxDeduction && (
        <CprInput
          label={<>CPR-nr.</>}
          name="tin"
          type="text"
          helper={<>Skriv CPR-nr. for at få skattefradrag.</>}
          style={{ maxWidth: "14rem" }}
        />
      )}

      <Button type="submit">
        <div style={{ display: "flex", alignItems: "center" }}>
          <span>Næste</span>
        </div>
      </Button>
    </>
  );
};
