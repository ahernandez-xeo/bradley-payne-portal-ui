import React, { useEffect } from 'react';

const TomorrowWeatherWidget = () => {
  useEffect(() => {
    const scriptId = 'tomorrow-sdk';
    
    // Check if the script is already loaded
    if (document.getElementById(scriptId)) {
      if (window.__TOMORROW__) {
        window.__TOMORROW__.renderWidget();
      }
      return;
    }

    // Create a new script element and set its attributes
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://www.tomorrow.io/v1/widget/sdk/sdk.bundle.min.js';
    script.async = true;

    // Append the script to the document
    document.body.appendChild(script);

    // Cleanup the script element on component unmount
    return () => {
      if (document.getElementById(scriptId)) {
        document.getElementById(scriptId).remove();
      }
    };
  }, []);

  return (
    <div className="tomorrow"
      data-location-id=""
      data-language="EN"
      data-unit-system="IMPERIAL"
      data-skin="light"
      data-widget-type="summary"
      style={{ paddingBottom: '22px', position: 'relative' }}
    >
    </div>
  );
};

export default TomorrowWeatherWidget;