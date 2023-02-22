import { useField } from "formik";

export const InvisibleInput = ({ label, helper, ...props }: any) => {
  const [field, meta] = useField(props);

  return (
    <>
      <div
        className={`form-group ${
          meta.touched && meta.error ? "form-error" : ""
        }`}
      >
        {field.value ? (
          <>
            <label className="form-label" htmlFor={props.id || props.name}>
              {label}
            </label>
            <div className="form-error-message">
              <span className="sr-only">Fejl:</span>
              {field.value}
            </div>
          </>
        ) : null}
        {meta.error && meta.touched ? (
          <>
            <label className="form-label" htmlFor={props.id || props.name}>
              {label}
            </label>
            <div className="form-error-message">
              <span className="sr-only">Fejl:</span>
              {meta.error}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
};
