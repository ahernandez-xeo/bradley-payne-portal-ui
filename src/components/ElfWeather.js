import React, { useEffect } from "react";

export default function ElfWeather() {
  useEffect(() => {
    // Create the script element
    const script = document.createElement("script");
    script.src = "https://static.elfsight.com/platform/platform.js";
    script.async = true;
    
    // Append the script to the body or a specific element
    document.body.appendChild(script);
    
    // Cleanup script if component unmounts
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div>
      <div class="elfsight-app-bb0de580-cc7d-4fe8-bf33-0566e75b3112" data-elfsight-app-lazy></div>
    </div>
  );
}