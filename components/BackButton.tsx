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
      <div className="form-group">
        <h5 style={{ marginTop: "15px" }}>
          <span
            onClick={props.onClick}
            className="back-link custom-back-link small-text"
            style={{ fontWeight: "normal" }}
          >
            Tilbage
          </span>
        </h5>
        <ul className="nobullet-list small-text checkout-list">
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
