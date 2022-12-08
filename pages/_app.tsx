import "dkfds/dist/css/dkfds.css";
import type { AppProps } from "next/app";
import "../styles/index.css";

function DonationPlatform({ Component, pageProps }: AppProps) {
  return (
    <>
      <div className="hide-base-svg">
        <svg xmlns="http://www.w3.org/2000/svg">
          <symbol id="arrow-forward" viewBox="0 0 24 24">
            <path d="M0 0h24v24H0V0z" fill="none"></path>
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"></path>
          </symbol>
        </svg>
      </div>
      <Component {...pageProps} />
    </>
  );
}

export default DonationPlatform;
