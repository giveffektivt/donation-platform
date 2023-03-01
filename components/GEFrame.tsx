import { Helper } from "comps";

type GEFrameInterface = {
  text: string | JSX.Element;
  children: JSX.Element[] | JSX.Element;
  className: string;
};

export const GEFrame = ({
  text,
  children,
  className,
}: GEFrameInterface): JSX.Element => {
  const isTestEnv = process.env.NEXT_PUBLIC_VERCEL_ENV !== "production";

  return (
    <div>
      <div className="wrapper2">
        <div className={"wrapper " + className}>
          <div className="custom-header">{text}</div>
          <div className="form-wrapper">{children}</div>
        </div>
      </div>
      {isTestEnv && <Helper />}
    </div>
  );
};
