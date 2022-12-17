import { useField } from "formik";

export const Address = ({ label, helper, ...props }: any) => {
  const [fieldAddress, metaAddress] = useField({ name: "address" });
  const [fieldZip, metaZip] = useField({ name: "zip" });
  const [fieldCity, metaCity] = useField({ name: "city" });

  return (
    <>
      <div
        className={`form-group ${
          metaAddress.touched && metaAddress.error ? "form-error" : ""
        }`}
      >
        <label className="form-label" htmlFor="address">
          Adresse
        </label>
        {metaAddress.touched && metaAddress.error ? (
          <div className="form-error-message">
            <span className="sr-only">Fejl:</span>
            {metaAddress.error}
          </div>
        ) : null}
        <input
          className="form-input full-width"
          {...fieldAddress}
          name="address"
          type="text"
        />
      </div>

      <div
        className={`form-group zip-city ${
          (metaZip.touched && metaZip.error) ||
          (metaCity.touched && metaCity.error)
            ? "form-error"
            : ""
        }`}
      >
        <label className="form-label" htmlFor="zip">
          Postnr.
        </label>

        <label className="form-label" htmlFor="city">
          By
        </label>

        <div className="form-error-message">
          {metaZip.touched && metaZip.error ? (
            <>
              <span className="sr-only">Fejl:</span>
              {metaZip.error}
            </>
          ) : null}
        </div>

        <div className="form-error-message">
          {metaCity.touched && metaCity.error ? (
            <>
              <span className="sr-only">Fejl:</span>
              {metaCity.error}
            </>
          ) : null}
        </div>

        <input
          className="form-input full-width"
          {...fieldZip}
          name="zip"
          type="number"
        />

        <input
          className="form-input full-width"
          {...fieldCity}
          name="city"
          type="text"
        />
      </div>
    </>
  );
};
