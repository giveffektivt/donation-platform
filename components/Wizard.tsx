import { BackButton, Wrapper } from "comps";
import { Form, Formik } from "formik";
import React, { useState } from "react";
import { submitForm } from "src/helpers";

type WizardProps = {
  children: any;
  initialValues: any;
};

const errorMessage = `
Der opstod en serverfejl. Prøv venligst igen. Skriv til os på donation@giveffektivt.dk \
hvis problemet opstår igen. Hvis muligt, så fortæl gerne, hvordan \
man kan fremprovokere fejlen.
`;

export const Wizard = ({ children, initialValues }: WizardProps) => {
  const [stepNumber, setStepNumber] = useState(0);
  const steps: any = React.Children.toArray(children); // Each WizardStep becomes an element in an array of steps. WizardStep evaluates itself to its insides but can still have props
  const [snapshot, setSnapshot] = useState(initialValues);

  const step = steps[stepNumber];
  const totalSteps = steps.length;

  const next = (values: any) => {
    setSnapshot(values);
    setStepNumber(Math.min(stepNumber + 1, totalSteps - 1));
  };

  const previous = (values: any) => {
    setSnapshot(values);
    setStepNumber(Math.max(stepNumber - 1, 0));
  };

  const handleSubmit = async (values: any, bag: any) => {
    try {
      bag.setTouched({});
      if (typeof step.props.onSubmit === "function") {
        //If onSubmit is set for steps, it will be executed.
        step.props.onSubmit();
      }

      switch (stepNumber) {
        case 0:
          next(values);
          break;
        case 1:
          await submitForm("donation", values, bag);
          if (values.method === "bankTransfer") {
            next(values);
          }
          break;
        case 2:
          (window.top || window).location.href =
            "https://giveffektivt.dk/tak-for-din-stotte/";
          break;
      }
    } catch (err) {
      alert(errorMessage);
      console.error(err);

      try {
        const response = await fetch("/api/reportError", { method: "POST" });
        if (!response.ok) {
          throw new Error("Unable to submit report about the critical error");
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <Formik
      initialValues={snapshot}
      onSubmit={handleSubmit}
      validationSchema={step.props.validationSchema}
    >
      {(formik) => (
        <div className="wrapper2">
          <Wrapper>
            <Form autoComplete="off" action="">
              {stepNumber === 1 && (
                <div>
                  <BackButton
                    onClick={() => previous(formik.values)}
                    stepNumber={stepNumber}
                  />
                </div>
              )}
              {step}
              <div />
            </Form>
          </Wrapper>
        </div>
      )}
    </Formik>
  );
};
