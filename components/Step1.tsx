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

  const explanations: { [key: string]: string } = {
    "GiveWell Maximum Impact Fund":
      "Din donation fordeles bedst muligt blandt humanitære organisationer, der har store og velkendte effekter.",
    "GiveWell All Grants Fund":
      "Din donation fordeles bedst muligt blandt humanitære organisationer, der potentielt har særdeles store effekter.",
    "Against Malaria Foundation":
      "Myggenet beskytter familier imod malariamyg, mens de sover.",
    "Malaria Consortium":
      "Der uddeles forebyggende malariamedicin i perioder, hvor smittetallet er særligt højt.",
    "Helen Keller International":
      "A-vitamin til børn under 5 år reducerer børnedødelighed i 21 lande.",
    "New Incentives":
      "Forældre får en økonomisk belønning for at få deres børn vaccineret.",
  };

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
        <option value="GiveWell Maximum Impact Fund" key={1}>
          Stor og sikker effekt (vores anbefaling)
        </option>
        <option value="GiveWell All Grants Fund">
          Større, men variabel effekt (GiveWell All Grants Fund)
        </option>
        <option value="Against Malaria Foundation">
          Myggenet mod malaria (Against Malaria Foundation)
        </option>
        <option value="Malaria Consortium">
          Medicin mod malaria (Malaria Consortium)
        </option>
        <option value="Helen Keller International">
          Vitamin mod mangelsygdomme (Helen Keller International)
        </option>
        <option value="New Incentives">
          Vacciner til spædbørn (New Incentives)
        </option>
      </Select>
      <p>{explanations[formik.values.recipient]}</p>

      <FrequencyRadio />
      <Checkbox
        name="taxDeduction"
        checkboxLabel={
          <>
            Få skattefradrag.
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
      )}

      <Button type="submit">
        <div style={{ display: "flex", alignItems: "center" }}>
          <span>Næste</span>
        </div>
      </Button>
    </>
  );
};
