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
      SUCCESS_URL_NEW_PAYMENT_INFO: string;
      RENEW_PAYMENT_INFO_URL: string;
      URL: string;
      CRON_API_KEY: string;
      GAVEBREV_API_KEY: string;
      FAILED_RECURRING_DONATIONS_API_KEY: string;
      EMAIL_RECEIPT_USERNAME: string;
      EMAIL_RECEIPT_PASSWORD: string;
      EMAIL_DONATION_USERNAME: string;
      EMAIL_DONATION_PASSWORD: string;
      DEV_WEBSITE_DOMAINS: string;
      MAILERSEND_API_KEY: string;
      MAILERSEND_TEMPLATE_DONATION: string;
      MAILERSEND_TEMPLATE_MEMBERSHIP: string;
      MAILERSEND_TEMPLATE_PAYMENT_EXPIRED: string;
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {};
