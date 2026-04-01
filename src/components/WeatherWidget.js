import React, { useEffect } from "react";

export default function WeatherWidget2() {
  useEffect(() => {
    // Create the script element
    const script = document.createElement("script");
    script.src = "https://app2.weatherwidget.org/js/?id=ww_ffb71811ab631";
    script.async = true;
    
    // Append the script to the body or a specific element
    document.body.appendChild(script);
    
    // Cleanup script if component unmounts
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    // Find the element with the specific class name
    const element = document.querySelector('#ww_ffb71811ab631 .ww_source');

    // Check if the element exists before trying to set its style
    if (element) {
      element.style.display = 'none';
    }
  }, []); // Empty dependency array means this runs once on mount

  return (
    <div>
      <div
        style={{color: "#001c2d"}}
        id="ww_ffb71811ab631"
        v="1.3"
        loc="auto"
        a='{"t":"ticker","lang":"en","sl_lpl":1,"ids":[],"font":"Arial","sl_ics":"one_a","sl_sot":"fahrenheit","cl_bkg":"image","cl_font":"#FFFFFF","cl_cloud":"#FFFFFF","cl_persp":"#81D4FA","cl_sun":"#FFC107","cl_moon":"#FFC107","cl_thund":"#FF5722"}'
      >
        More forecasts:{" "}
        <a
          style={{color: "#001c2d"}}
          href="https://oneweather.org/london/30_days/"
          id="ww_ffb71811ab631_u"
          target="_blank"
          rel="noopener noreferrer"
        >
          London 30 days weather forecast
        </a>
      </div>
    </div>
  );
}