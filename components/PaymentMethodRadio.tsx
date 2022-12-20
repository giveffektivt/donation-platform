import { useField, useFormikContext } from "formik";
import Image from "next/image";
import { SubmitDataDonation } from "src";
import bank from "../public/bank.svg";
import mastercard from "../public/mastercard.svg";
import mobilepay from "../public/mobilepay.svg";
import visa from "../public/visa.svg";

export const PaymentMethodRadio = () => {
  const formik = useFormikContext<SubmitDataDonation>();
  const name = "method";

  const [creditCardField, meta] = useField({
    name: name,
    type: "radio",
    value: "creditCard",
  });
  const [mobilePayField] = useField({
    name: name,
    type: "radio",
    value: "mobilePay",
  });
  const [bankTransferField] = useField({
    name: name,
    type: "radio",
    value: "bankTransfer",
  });

  const shouldUseBankTransfer =
    formik.values.amount >= 5000 && formik.values.amount < 7400;

  const canUseMobilePay =
    formik.values.frequency === "oneTime" || formik.values.amount === 3; // "Hidden" for testing purposes :)

  const mustUseBankTransfer = formik.values.amount >= 7400;

  if (formik.values.method === "" && mustUseBankTransfer) {
    formik.values.method = "bankTransfer";
  }

  return (
    <div
      className={`form-group ${meta.touched && meta.error ? "form-error" : ""}`}
    >
      <fieldset>
        <legend>
          <strong>Betalingsmetode</strong>
        </legend>
        {meta.touched && meta.error && (
          <span className="form-error-message">
            <span className="sr-only">Fejl:</span>
            {meta.error}
          </span>
        )}

        <ul className="nobullet-list">
          {!mustUseBankTransfer && (
            <li className="flx-center gap-5">
              <input
                className="form-radio radio-large"
                id={creditCardField.value}
                type="radio"
                {...creditCardField}
              />
              <label htmlFor={creditCardField.value}>
                <span>Betalingskort</span>
              </label>
              <div className="flx-center gap-5">
                <Image
                  width="70"
                  height="20"
                  src={visa}
                  quality="100"
                  alt="Visa logo"
                />
                <Image
                  width="50"
                  height="40"
                  src={mastercard}
                  quality="100"
                  alt="Mastercard logo"
                />
              </div>
            </li>
          )}

          {canUseMobilePay && !mustUseBankTransfer && (
            <li className="flx-center gap-5">
              <input
                className="form-radio radio-large"
                id={mobilePayField.value}
                type="radio"
                {...mobilePayField}
              />
              <label htmlFor={mobilePayField.value}>MobilePay</label>
              <div style={{ margin: "0 0px 0 auto" }}>
                <Image
                  src={mobilepay}
                  width="125"
                  height="40"
                  quality="100"
                  alt="MobilePay logo"
                />
              </div>
            </li>
          )}

          <li className="flx-center gap-5">
            <input
              className="form-radio radio-large"
              id={bankTransferField.value}
              type="radio"
              {...bankTransferField}
            />
            <label htmlFor={bankTransferField.value}>
              <span>
                Bankoverførsel{" "}
                {shouldUseBankTransfer && "(anbefalet for højt beløb)"}
              </span>
            </label>
            <div className="flx-center gap-5">
              <Image
                src={bank}
                width="35"
                height="35"
                quality="100"
                alt="Visa logo"
              />
            </div>
          </li>
        </ul>
      </fieldset>
    </div>
  );
};
