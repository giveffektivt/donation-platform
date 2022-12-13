import { AmountButton } from "components";
import { useField } from "formik";
import { useState } from "react";
import { useFormikContext } from "formik";
import { useEffect } from "react";

export const AmountInput = ({ label, helper, ...props }: any) => {
  const formik = useFormikContext<any>();

  const [field, meta, helpers] = useField(props);
  const { setValue } = helpers;

  const visibleProps = { ...props, name: "visibleAmount" };
  const [visibleField, _visibleMeta, visibleHelpers] = useField(visibleProps);
  const { setValue: setVisibleValue } = visibleHelpers;
  const newVisibleField = {
    ...visibleField,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      setValue(parseInt(event.target.value) || "");
      setLastClicked("");
      return visibleField.onChange(event);
    },
  };

  const [lastClicked, setLastClicked] = useState("");

  useEffect(() => {
    setLastClicked(formik.values.amount.toString());
    if ([200, 500, 1000].includes(formik.values.visibleAmount)) {
      formik.values.visibleAmount = "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div
        className={`form-group ${
          meta.touched && meta.error ? "form-error" : "null"
        }`}
      >
        <label className="form-label" htmlFor={props.id || props.name}>
          {label}
        </label>
        {helper && (
          <span style={{ padding: "2px 0 0 0 " }} className="form-hint">
            {helper}
          </span>
        )}
        {meta.touched && meta.error ? (
          <div className="form-error-message">
            <span className="sr-only">Fejl:</span>
            {meta.error === "7400" ? ( //Error message for too high donation
              <>
                Vi kan ikke modtage donationer over 7.400 DKK. Spred din
                donation over flere dage, eller kontakt{" "}
                <a
                  href="mailto:donation@giveffektivt.dk"
                  style={{ color: "darkblue" }}
                >
                  donation@giveffektivt.dk
                </a>{" "}
                ang. bankoverførsel.
              </>
            ) : (
              meta.error
            )}
          </div>
        ) : null}
        <div className="amount-row">
          <input
            className="form-input"
            type="number"
            {...field}
            {...props}
            style={{ display: "none" }}
          />
          <input
            className="form-input amount"
            type="number"
            {...newVisibleField}
            {...visibleProps}
          />
          <AmountButton
            amount="200"
            lastClicked={lastClicked}
            setLastClicked={setLastClicked}
            setVisibleValue={setVisibleValue}
            setValue={setValue}
          />
          <AmountButton
            amount="500"
            lastClicked={lastClicked}
            setLastClicked={setLastClicked}
            setVisibleValue={setVisibleValue}
            setValue={setValue}
          />
          <AmountButton
            amount="1000"
            lastClicked={lastClicked}
            setLastClicked={setLastClicked}
            setVisibleValue={setVisibleValue}
            setValue={setValue}
          />
        </div>
      </div>
    </>
  );
};
