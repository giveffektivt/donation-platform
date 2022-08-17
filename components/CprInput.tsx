import { useField, useFormikContext } from "formik";
import _ from "lodash";
import React from "react";

export const CprInput = ({ label, helper, ...props }: any) => {
  const [field, meta] = useField(props);

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let newEvent = event;
    let value: string = event.target.value;

    if (value.length > 6 && value.indexOf("-") === -1) {
      newEvent.target.value = `${value.slice(0, 6)}-${value.slice(6)}`;
    }

    return field.onChange(newEvent);
  };

  const newField = { ...field, onChange };

  return (
    <>
      <div
        className={`form-group ${
          meta.touched && meta.error ? "form-error" : ""
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
            {meta.error}
          </div>
        ) : null}
        <input className="form-input" {...newField} {...props} />
      </div>
    </>
  );
};
