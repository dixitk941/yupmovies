import React, { useEffect, useRef } from 'react';

const AdsterraAd = ({ adType, zone }) => {
  const adContainerRef = useRef(null);

  useEffect(() => {
    // Create ad container if it doesn't exist
    if (!adContainerRef.current) return;

    // Clear any existing content
    while (adContainerRef.current.firstChild) {
      adContainerRef.current.removeChild(adContainerRef.current.firstChild);
    }

    // Insert your Adsterra ad code here
    const adScript = document.createElement('script');
    
    // Use the appropriate script based on ad type
    if (adType === 'banner') {
      adScript.innerHTML = `
        atOptions = {
          'key': '6fdb61a80f1f832b67418a9ec7bce67b',
          'format': 'iframe',
          'height': 90,
          'width': 728,
          'params': {}
        };
        document.write('<scr' + 'ipt type="text/javascript" src="//pl20750537.highcpmrevenuegate.com/6f/db/61/6fdb61a80f1f832b67418a9ec7bce67b.js"></scr' + 'ipt>');
      `;
    } else if (adType === 'popunder') {
      adScript.innerHTML = `
        atOptions = {
          'key': '6fdb61a80f1f832b67418a9ec7bce67b',
          'format': 'popunder',
          'params': {}
        };
        document.write('<scr' + 'ipt type="text/javascript" src="//pl20750537.highcpmrevenuegate.com/6f/db/61/6fdb61a80f1f832b67418a9ec7bce67b.js"></scr' + 'ipt>');
      `;
    } else if (adType === 'social-bar') {
      adScript.innerHTML = `
        atOptions = {
          'key': '6fdb61a80f1f832b67418a9ec7bce67b',
          'format': 'social-bar',
          'height': 50,
          'width': 320,
          'params': {}
        };
        document.write('<scr' + 'ipt type="text/javascript" src="//pl20750537.highcpmrevenuegate.com/6f/db/61/6fdb61a80f1f832b67418a9ec7bce67b.js"></scr' + 'ipt>');
      `;
    }

    // Append to container
    adContainerRef.current.appendChild(adScript);

    // Execute the script
    const scriptContent = adScript.innerHTML;
    const newScript = document.createElement('script');
    newScript.text = scriptContent;
    adContainerRef.current.appendChild(newScript);

    // Cleanup function
    return () => {
      while (adContainerRef.current && adContainerRef.current.firstChild) {
        adContainerRef.current.removeChild(adContainerRef.current.firstChild);
      }
    };
  }, [adType, zone]);

  return <div ref={adContainerRef} className="adsterra-container"></div>;
};

export default AdsterraAd;