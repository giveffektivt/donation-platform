import { useField } from "formik";

export const FrequencyRadio = () => {
  const name = "subscription";

  const [everyMonthField, meta] = useField({
    name: name,
    type: "radio",
    value: "everyMonth",
  });
  const [oneTimeField] = useField({
    name: name,
    type: "radio",
    value: "oneTime",
  });

  return (
    <div
      className={`form-group ${meta.touched && meta.error ? "form-error" : ""}`}
    >
      <fieldset>
        <legend>
          <strong>Hvor ofte vil du donere?</strong>
        </legend>
        {meta.touched && meta.error && (
          <span className="form-error-message">
            <span className="sr-only">Fejl:</span>
            {meta.error}
          </span>
        )}
        <ul className="nobullet-list">
          <li>
            <input
              className="form-radio radio-large"
              id={everyMonthField.value}
              type="radio"
              {...everyMonthField}
            />
            <label htmlFor={everyMonthField.value}>
              Hver måned (trækkes automatisk)
            </label>
          </li>

          <li>
            <input
              className="form-radio radio-large"
              id={oneTimeField.value}
              type="radio"
              {...oneTimeField}
            />
            <label htmlFor={oneTimeField.value}>Kun én gang</label>
          </li>
        </ul>
      </fieldset>
    </div>
  );
};
