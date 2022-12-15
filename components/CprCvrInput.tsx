import { useField } from "formik";
import React from "react";

export const CprCvrInput = ({ label, helper, isNested, ...props }: any) => {
  const [field, meta] = useField(props);
  const [hasTypedDash, setHasTypedDash] = React.useState(false);

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let newEvent = event;
    let value: string = event.target.value;

    if (value.indexOf("-") === -1) {
      setHasTypedDash(false);
    } else if (value[value.length - 1] === "-") {
      setHasTypedDash(true);
    }

    if (value.length == 10) {
      if (value.indexOf("-") === -1) {
        newEvent.target.value = `${value.slice(0, 6)}-${value.slice(6)}`;
      } else if (!hasTypedDash) {
        newEvent.target.value = value.replace("-", "");
      }
    }

    return field.onChange(newEvent);
  };

  const newField = { ...field, onChange };

  const formClass = isNested ? "form-nested" : "";
  const formStyle = isNested ? { marginTop: "5px" } : {};

  return (
    <>
      <div
        className={`form-group ${
          meta.touched && meta.error ? "form-error" : formClass
        }`}
        style={formStyle}
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
            {meta.error}
          </div>
        ) : null}
        <input className="form-input" {...newField} {...props} />
      </div>
    </>
  );
};
