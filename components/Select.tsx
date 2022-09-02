import { useField } from "formik";

interface SelectProps {
  label: string | JSX.Element;
  children: JSX.Element[];
  helper?: string | JSX.Element;
  name: string;
  id?: string;
}

export const Select = ({ label, helper, children, ...props }: SelectProps) => {
  const [field, meta] = useField(props);

  return (
    <>
      <div
        className={`form-group ${
          meta.touched && meta.error ? "form-error" : null
        } aa`}
      >
        <label className="form-label" htmlFor={props.id || props.name}>
          {label}
        </label>
        {helper && <span className="form-hint">{helper}</span>}
        {meta.touched && meta.error ? (
          <div className="form-error-message">
            <span className="sr-only">Fejl:</span>
            {meta.error}
          </div>
        ) : null}
        <select className="form-select" {...field} {...props}>
          {children}
        </select>
      </div>
    </>
  );
};
