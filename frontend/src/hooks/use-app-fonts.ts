import * as Font from "expo-font";
import { useEffect, useState } from "react";

// Load fonts from Google Fonts CDN via expo-font.loadAsync
export function useAppFonts() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        await Font.loadAsync({
          Fredoka: "https://fonts.gstatic.com/s/fredoka/v14/X7nP4b87HvSqjb_WIi2yDCRwoQ_k7367_B-i2yQag0-mac3O8SLM.ttf",
          FredokaBold: "https://fonts.gstatic.com/s/fredoka/v14/X7nP4b87HvSqjb_WIi2yDCRwoQ_k7367_B-i2yQag0-maU3O8SLM.ttf",
          Nunito: "https://fonts.gstatic.com/s/nunito/v26/XRXV3I6Li01BKofINeaBTMnFcQ.ttf",
          NunitoBold: "https://fonts.gstatic.com/s/nunito/v26/XRXW3I6Li01BKofA6sKUYevN.ttf",
        });
      } catch {
        // If CDN unreachable, skip — will fall back to system font
      } finally {
        setLoaded(true);
      }
    })();
  }, []);
  return loaded;
}
