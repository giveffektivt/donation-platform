import { useField } from "formik";

type CheckboxProps = {
  name: string;
  label?: JSX.Element | string;
  helper?: JSX.Element | string;
  checkboxLabel?: JSX.Element | string;
  disabled?: boolean;
  labelPadding?: boolean;
};

export function Checkbox({
  label,
  helper,
  checkboxLabel,
  disabled = false,
  labelPadding = true,
  ...props
}: CheckboxProps): JSX.Element {
  const [field, meta] = useField({
    name: props.name,
    id: props.name,
    type: "checkbox",
  });

  return (
    <div
      className={`form-group ${meta.touched && meta.error ? "form-error" : ""}`}
    >
      <fieldset>
        {label ? <legend className="form-label">{label}</legend> : null}
        {helper && (
          <span style={{ padding: "2px 0 0px 0 " }} className="form-hint">
            {helper}
          </span>
        )}
        {meta.touched && meta.error ? (
          <div className="form-error-message">
            <span className="sr-only">Fejl:</span>
            {meta.error}
          </div>
        ) : null}
        <ul className="nobullet-list">
          <li key="key">
            <input
              disabled={disabled}
              id={props.name}
              {...field}
              type="checkbox"
              className="form-checkbox checkbox-large"
            />
            <label
              htmlFor={props.name}
              style={labelPadding ? {} : { paddingTop: 0 }}
            >
              {checkboxLabel ? checkboxLabel : null}
            </label>
          </li>
        </ul>
      </fieldset>
    </div>
  );
}
