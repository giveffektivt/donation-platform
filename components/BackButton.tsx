import { useFormikContext } from "formik";
import { useEffect } from "react";

export const BackButton = ({
  ...props
}: {
  onClick: () => void;
  stepNumber: number;
}) => {
  const { membership, subscription, recipient, amount, taxDeduction } =
    useFormikContext<any>().values;
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
          {subscription === "oneTime" ? (
            <li>
              {amount} kr. til {recipient}
            </li>
          ) : (
            ""
          )}
          {subscription === "everyMonth" ? (
            <li>
              {amount} kr. til {recipient} (månedligt)
            </li>
          ) : (
            ""
          )}
          {membership && props.stepNumber > 1 ? (
            <li>50 kr. medlemskab (årligt)</li>
          ) : (
            ""
          )}
          {taxDeduction ? <li>Du har ønsket fradrag.</li> : ""}
        </ul>
        {/* <span>
        {" "}
        <span style={{ padding: "0px 10px 0 0 " }}>◂</span>
        {formik.values.amount} kr til {formik.values.recipient} (
        <span {...props} className="custom-back-link">
          redigér
        </span>
        )
      </span> */}
      </div>
    </>
  );
};
