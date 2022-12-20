import { useField } from "formik";
import { DonationFrequency } from "src/donation/types";

export const FrequencyRadio = () => {
  const name = "frequency";

  const [monthlyField, meta] = useField({
    name: name,
    type: "radio",
    value: DonationFrequency.Monthly,
  });
  const [onceField] = useField({
    name: name,
    type: "radio",
    value: DonationFrequency.Once,
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
              id={monthlyField.value}
              type="radio"
              {...monthlyField}
            />
            <label htmlFor={monthlyField.value}>
              Hver måned (trækkes automatisk)
            </label>
          </li>

          <li>
            <input
              className="form-radio radio-large"
              id={onceField.value}
              type="radio"
              {...onceField}
            />
            <label htmlFor={onceField.value}>Kun én gang</label>
          </li>
        </ul>
      </fieldset>
    </div>
  );
};
