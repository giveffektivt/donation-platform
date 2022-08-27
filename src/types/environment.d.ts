declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production";
      VERCEL_ENV: "development" | "preview" | "production";
      PAYMENT_GATEWAY: "Quickpay" | "Scanpay";
      QUICKPAY_DONATION_API_KEY: string;
      QUICKPAY_DONATION_PRIVATE_KEY: string;
      QUICKPAY_MEMBERSHIP_API_KEY: string;
      QUICKPAY_MEMBERSHIP_PRIVATE_KEY: string;
      QUICKPAY_CALLBACK_URL: string;
      SCANPAY_KEY: string;
      SCANPAY_HOSTNAME: string;
      SUCCESS_URL: string;
      SUCCESS_URL_MEMBERSHIP_ONLY: string;
      URL: string;
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {};
