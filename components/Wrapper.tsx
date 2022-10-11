import React from "react";
import { Helper } from "./Helper";

export const Wrapper = ({ children }: any) => {
  const isTestEnv = process.env.NEXT_PUBLIC_VERCEL_ENV !== "production";

  return (
    <>
      <div className="wrapper">
        <div className="custom-header">
          Støt et effektivt velgørende formål
          {isTestEnv && " ***TEST ENVIRONMENT***"}
        </div>
        <div className="form-wrapper">{children}</div>
      </div>
      {isTestEnv && <Helper />}
    </>
  );
};
