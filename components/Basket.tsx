import React from "react";
import { useFormikContext } from "formik";

export function Basket() {
  const formik = useFormikContext<any>();
  const { membership, subscription, recipient, amount, taxDeduction } =
    formik.values;

  return (
    <>
      <h5 style={{ marginTop: "15px" }}>Kurv</h5>
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
        {membership ? <li>50 kr. medlemskab (årligt)</li> : ""}
        {taxDeduction ? <li>Du har ønsket fradrag.</li> : ""}
      </ul>
    </>
  );
}
