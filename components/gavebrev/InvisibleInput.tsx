import { useField } from "formik";

export const InvisibleInput = ({ label, helper, ...props }: any) => {
  const [field, meta] = useField(props);
  const isVisible = field.value || (meta.error && meta.touched);

  return (
    <>
      <div className={`form-group ${isVisible ? "form-error" : ""}`}>
        {isVisible ? (
          <>
            <label className="form-label" htmlFor={props.id || props.name}>
              {label}
            </label>
            <div className="form-error-message">
              {field.value ? field.value : meta.error}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
};
