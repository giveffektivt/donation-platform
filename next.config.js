/** @type {import('next').NextConfig} */
module.exports = {
  async headers() {
    const allowed = [
      "https://giveffektivt.dk",
      ...(process.env.DEV_WEBSITE_DOMAINS
        ? process.env.DEV_WEBSITE_DOMAINS.split(",")
        : []),
    ];

    return allowed.map((origin) => ({
      source: "/api/:path*",
      has: [
        {
          type: "header",
          key: "origin",
          value: origin,
        },
      ],
      headers: [
        {
          key: "Access-Control-Allow-Origin",
          value: origin,
        },
        {
          key: "Access-Control-Allow-Methods",
          value: "GET,POST",
        },
        {
          key: "Access-Control-Allow-Headers",
          value: "Authorization, Content-Type",
        },
      ],
    }));
  },
};
