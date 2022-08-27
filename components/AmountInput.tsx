import { Button } from "components";
import { useField } from "formik";
import { useRef, useState } from "react";

export const AmountInput = ({ label, helper, ...props }: any) => {
  const [field, meta, helpers] = useField(props);
  const { setValue } = helpers;
  const [visible, setVisible] = useState(false);
  const [lastClicked, setLastClicked] = useState("");
  const inputRef = useRef<HTMLInputElement>();

  return (
    <>
      <div
        className={`form-group ${
          meta.touched && meta.error ? "form-error" : "null"
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
            {meta.error === "7400" ? ( //Error message for too high donation
              <>
                Vi kan ikke modtage donationer over 7.400 DKK. Spred din
                donation over flere dage, eller kontakt{" "}
                <a
                  href="mailto:donation@giveffektivt.dk"
                  style={{ color: "darkblue" }}
                >
                  donation@giveffektivt.dk
                </a>{" "}
                ang. bankoverførsel.
              </>
            ) : (
              meta.error
            )}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            alignContent: "center",
            gap: "10px",
            marginTop: "8px",
            flexDirection: "row",
            flexWrap: "wrap",
          }}
        >
          <Button
            type="button"
            buttonMargin="0"
            onClick={() => {
              setValue(200);
              setVisible(false);
              setLastClicked("200");
            }}
            secondary
            className={`${lastClicked === "200" ? "button-active" : ""}`}
          >
            200
          </Button>
          <Button
            type="button"
            buttonMargin="0"
            onClick={() => {
              setValue(500);
              setVisible(false);
              setLastClicked("500");
            }}
            secondary
            marginTop={"0"}
            className={`${lastClicked === "500" ? "button-active" : ""}`}
          >
            500
          </Button>

          <Button
            type="button"
            buttonMargin="0"
            onClick={() => {
              setValue(1000);
              setVisible(false);
              setLastClicked("1000");
            }}
            secondary
            className={`${lastClicked === "1000" ? "button-active" : ""}`}
            marginTop={"0"}
          >
            1.000
          </Button>
          <Button
            type="button"
            buttonMargin="0"
            onClick={() => {
              setVisible(true);
              setLastClicked("Other");
              setValue(1);
              setTimeout(() => {
                inputRef.current && inputRef.current.focus();
              }, 1);
            }}
            secondary
            marginTop={"0"}
            className={`${lastClicked === "Other" ? "button-active" : ""}`}
          >
            Andet
          </Button>
          <div style={{ display: `${visible ? "" : "none"}` }}>
            <input
              className="form-input"
              type="number"
              {...field}
              {...props}
              ref={inputRef}
            />
          </div>
        </div>
      </div>
    </>
  );
};
