import React from 'react';

const MeteoblueWidget = () => {
  return (
    <div>
      <iframe 
        src="https://www.meteoblue.com/en/weather/widget/daily?geoloc=detect&days=3&tempunit=FAHRENHEIT&windunit=MILE_PER_HOUR&precipunit=INCH&coloured=coloured&pictoicon=1&maxtemperature=1&mintemperature=1&windspeed=0&windgust=0&winddirection=0&uv=0&humidity=0&precipitation=1&precipitationprobability=1&spot=0&pressure=0&layout=light"  
        frameBorder="0" 
        scrolling="NO" 
        allowTransparency="true" 
        sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox" 
        style={{ width: '162px', height: '250px' }}
      ></iframe>
      <div>
        {/* DO NOT REMOVE THIS LINK */}
        <a 
          href="https://www.meteoblue.com/en/weather/week/index?utm_source=daily_widget&utm_medium=linkus&utm_content=daily&utm_campaign=Weather%2BWidget" 
          target="_blank" 
          rel="noopener noreferrer"
        >
          meteoblue
        </a>
      </div>
    </div>
  );
};

export default MeteoblueWidget;