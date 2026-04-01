import React, { useEffect } from "react";
import classes from "./CryptoWidget.module.scss";

export default function CryptoWidget(hasVerticalScrollbar) {
  useEffect(() => {
    // Check if the script is already present
    const existingScript = document.querySelector(
      'script[src="https://price-static.crypto.com/latest/public/static/widget/index.js"]'
    );

    // If the script is already loaded, do not load it again
    if (!existingScript) {
      // Create the script element
      const script = document.createElement("script");
      script.src =
        "https://price-static.crypto.com/latest/public/static/widget/index.js";
      script.async = true;

      // Append the script to the body
      document.body.appendChild(script);

      // Cleanup the script if the component unmounts
      return () => {
        document.body.removeChild(script);
      };
    }
  }, []);

  useEffect(() => {
    // Find the element with the specific class name
    const element = document.querySelector('chakra-text css-5grxaj');

    // Check if the element exists before trying to set its style
    if (element) {
      element.style.display = 'none';
    }
  }, []); // Empty dependency array means this runs once on mount

  return (
    <div class={`${hasVerticalScrollbar ? classes.cryptoContainerScroll : classes.cryptoContainer}`}>
      <div
        id="crypto-widget-CoinList" 
        data-design="classic" 
        data-coin-ids="1"
      ></div>
    </div>
  );
}
