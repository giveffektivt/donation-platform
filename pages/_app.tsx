import "dkfds/dist/css/dkfds.css";
import type { AppProps } from "next/app";
import "../styles/index.css";
import { Poppins } from "@next/font/google";

const poppins = Poppins({ weight: "400" });

function DonationPlatform({ Component, pageProps }: AppProps) {
  return (
    <>
      <div className="hide-base-svg">
        <svg xmlns="http://www.w3.org/2000/svg">
          <symbol id="arrow-forward" viewBox="0 0 24 24">
            <path d="M0 0h24v24H0V0z" fill="none"></path>
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"></path>
          </symbol>
          <symbol id="search" viewBox="0 0 24 24">
            <path d="M0 0h24v24H0V0z" fill="none" />
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </symbol>
        </svg>
      </div>
      <main className={poppins.className}>
        <Component {...pageProps} />
      </main>
    </>
  );
}

export default DonationPlatform;
