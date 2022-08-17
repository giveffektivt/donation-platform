import { Helper } from "comps";

type GEFrameInterface = {
  text: string | JSX.Element;
  children: JSX.Element[] | JSX.Element;
  currentStep: number;
  maxStep: number;
};

export const GEFrame = ({
  text,
  children,
  currentStep,
  maxStep,
}: GEFrameInterface): JSX.Element => {
  const isTestEnv = process.env.NEXT_PUBLIC_VERCEL_ENV !== "production";

  return (
    <div>
      <div className="wrapper2">
        <div className="wrapper">
          <div className="custom-header">{text}</div>
          <div className="form-wrapper">
            {children}
            <div className="clearfix">
              <span style={{ float: "right" }}>{`Trin ${
                currentStep + 1
              } af ${maxStep}`}</span>
            </div>
          </div>
        </div>
      </div>
      {isTestEnv && <Helper />}
    </div>
  );
};
