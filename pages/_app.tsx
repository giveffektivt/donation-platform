import type { AppProps } from 'next/app'
import "../styles/index.css";
import "dkfds/dist/css/dkfds.css"

function DonationPlatform({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}

export default DonationPlatform
