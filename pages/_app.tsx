// import '../styles/globals.css'
// import 'tailwindcss/tailwind.css';

// import React from 'react'
// import { Windmill } from '@roketid/windmill-react-ui'
// import type { AppProps } from 'next/app'
// import { Toaster } from "react-hot-toast";

// function MyApp({ Component, pageProps }: AppProps) {
//   // suppress useLayoutEffect warnings when running outside a browser
//   if (!process.browser) React.useLayoutEffect = React.useEffect;

//   return (
//     <Windmill usePreferences={true}>
//       <Toaster
//         position="top-right"
//         toastOptions={{
//           duration: 4000,
//           style: {
//             borderRadius: "12px",
//             background: "#fff",
//             color: "#111827",
//             border: "1px solid #dcfce7",
//           },
//           success: {
//             iconTheme: {
//               primary: "#15803d",
//               secondary: "#ffffff",
//             },
//           },
//           error: {
//             iconTheme: {
//               primary: "#dc2626",
//               secondary: "#ffffff",
//             },
//           },
//         }}
//       />
//       <Component {...pageProps} />
//     </Windmill>
//   )
// }
// export default MyApp

import "../styles/globals.css";
import "tailwindcss/tailwind.css";

import React from "react";
import { Windmill } from "@roketid/windmill-react-ui";
import type { AppProps } from "next/app";
import { Toaster } from "react-hot-toast";

function MyApp({ Component, pageProps }: AppProps) {
  if (typeof window === "undefined") {
    React.useLayoutEffect = React.useEffect;
  }

  return (
    <Windmill usePreferences={true}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: "12px",
            background: "#fff",
            color: "#111827",
            border: "1px solid #dcfce7",
          },
          success: {
            iconTheme: {
              primary: "#15803d",
              secondary: "#ffffff",
            },
          },
          error: {
            iconTheme: {
              primary: "#dc2626",
              secondary: "#ffffff",
            },
          },
        }}
      />
      <Component {...pageProps} />
    </Windmill>
  );
}

export default MyApp;
