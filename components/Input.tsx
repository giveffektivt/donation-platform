import { useField } from "formik";

export const Input = ({ label, helper, ...props }: any) => {
  const [field, meta] = useField(props);

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
        <input className="form-input" {...field} {...props} />
      </div>
    </>
  );
};
