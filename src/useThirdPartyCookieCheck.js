import { useEffect, useState } from "react";

export const useThirdPartyCookieCheck = () => {

    const [isSupported, setIsSupported] = useState(true);

    useEffect(() => {
        const frame = document.createElement("iframe");
        frame.id = "3pc";
        frame.src =
            "https://us-west1-priority-power-portal.cloudfunctions.net/cookie-check";// Add your domain here
        frame.style.display = "none";
        frame.style.position = "fixed";
        document.body.appendChild(frame);

        window.addEventListener(
            "message",
            function listen(event) {
                if (event.data === "3pcSupported" || event.data === "3pcUnsupported") {
                    setIsSupported(event.data === "3pcSupported");
                    document.body.removeChild(frame);
                    window.removeEventListener("message", listen);
                }
            },
            false
        );
    }, []);

    return isSupported;
};