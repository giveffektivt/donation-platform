import { useFormikContext } from "formik";
import { SubmitDataDonation } from "src/types";
import { DonationFrequency } from "src/donation/types";

export const BackButton = ({
  ...props
}: {
  onClick: () => void;
  stepNumber: number;
}) => {
  const { frequency, recipient, amount, taxDeductible } =
    useFormikContext<SubmitDataDonation>().values;
  return (
    <>
      <div
        className="form-group"
        style={{ backgroundColor: "#b9b9b9", padding: "2px 17px 2px 17px" }}
      >
        <h5 style={{ marginTop: "15px" }}>
          Kurv{" "}
          <span
            onClick={props.onClick}
            className="custom-back-link"
            style={{ fontWeight: "normal" }}
          >
            (redigér)
          </span>
        </h5>
        <ul>
          <li>
            {amount} kr. til {recipient}{" "}
            {frequency === DonationFrequency.Monthly && "(månedligt)"}
          </li>
          {taxDeductible && <li>Du har ønsket fradrag</li>}
        </ul>
      </div>
    </>
  );
};
