import React, { useEffect } from "react";

export default function CoindeskWidget() {
    useEffect(() => {
        const scriptId = 'btcwdgt';
    
        // Check if the script is already added
        if (document.getElementById(scriptId)) return;
    
        // Create a script element and set its attributes
        const script = document.createElement('script');
        script.src = 'https://widgets.bitcoin.com/widget.js';
        script.id = scriptId;
    
        // Append the script to the document body
        document.body.appendChild(script);
    
        // Cleanup function to remove the script when the component unmounts
        return () => {
          if (document.getElementById(scriptId)) {
            document.getElementById(scriptId).remove();
          }
        };
      }, []);

  return (
    <div style={{ maxHeight: "80px", overflow: "hidden", width: "200px" }}>
        <div class="btcwdgt-price" bw-theme="light"></div>
    </div>
  );
}
