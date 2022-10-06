import {
  AmountInput,
  Button,
  Checkbox,
  CprInput,
  FrequencyRadio,
  Select,
} from "comps";
import { useFormikContext } from "formik";
import { DonationRecipient } from "src/donation/types";
import { donationPurpose, donationPurposeDescription } from "src/helpers/texts";

export const Step1 = () => {
  const formik = useFormikContext<any>();

  // Reset payment method in case user selected MobilePay, clicked back and now wants to pick monthly donation
  formik.values.method = "";

  return (
    <>
      <AmountInput
        label={
          <>
            Beløb
            <span className="form-hint" style={{ display: "inline" }}>
              {" "}
              (i DKK)
            </span>
          </>
        }
        name="amount"
        type="number"
        placeholder="Andet"
        style={{ maxWidth: "8rem", marginTop: 0 }}
      />

      <Select
        label={
          <>
            Hvad vil du støtte?
            <a
              href="https://giveffektivt.dk/bedste-organisationer/"
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                verticalAlign: "middle",
                marginLeft: 5,
              }}
            >
              <i className="icon icon-help"></i>
            </a>
          </>
        }
        name="recipient"
      >
        {Object.entries(donationPurpose)
          .filter(([value, _]) => value !== DonationRecipient.GivEffektivt)
          .map(([value, description], i) => (
            <option value={value} key={i}>
              {description}
            </option>
          ))}
      </Select>
      <p>
        {
          donationPurposeDescription[
            formik.values.recipient as DonationRecipient
          ]
        }
      </p>

      <FrequencyRadio />
      <Checkbox
        name="taxDeduction"
        checkboxLabel={
          <>
            Jeg ønsker skattefradrag
            <a
              href="https://giveffektivt.dk/fradrag/"
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                verticalAlign: "middle",
                marginLeft: 5,
              }}
            >
              <i className="icon icon-help"></i>
            </a>
          </>
        }
      />

      {formik.values.taxDeduction && (
        <>
          <div className="form-hint">
            Betinget af, at SKAT godkender vores ansøgning.{" "}
            <a
              href="https://giveffektivt.dk/fradrag/"
              target="_blank"
              rel="noreferrer"
            >
              Læs mere...
            </a>
          </div>
          <CprInput
            label={
              <>
                CPR-nummer
                <span className="form-hint" style={{ display: "inline" }}>
                  {" "}
                  (bruges af Skatteforvaltningen)
                </span>
              </>
            }
            name="tin"
            type="text"
            style={{ maxWidth: "14rem" }}
          />
        </>
      )}

      <Button type="submit">
        <div style={{ display: "flex", alignItems: "center" }}>
          <span>Næste</span>
        </div>
      </Button>
    </>
  );
};
