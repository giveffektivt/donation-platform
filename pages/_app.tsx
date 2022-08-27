import "dkfds/dist/css/dkfds.css";
import type { AppProps } from "next/app";
import "../styles/index.css";

function DonationPlatform({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default DonationPlatform;
