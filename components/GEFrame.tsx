import { Helper } from "comps";

type GEFrameInterface = {
  text: string | JSX.Element;
  children: JSX.Element[] | JSX.Element;
};

export const GEFrame = ({ text, children }: GEFrameInterface): JSX.Element => {
  const isTestEnv = process.env.NEXT_PUBLIC_VERCEL_ENV !== "production";

  return (
    <div>
      <div className="wrapper2">
        <div className="wrapper">
          <div className="custom-header">{text}</div>
          <div className="form-wrapper">{children}</div>
        </div>
      </div>
      {isTestEnv && <Helper />}
    </div>
  );
};
