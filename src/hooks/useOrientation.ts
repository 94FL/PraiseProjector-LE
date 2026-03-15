import { useState, useEffect } from "react";

export type Orientation = "portrait" | "landscape";

export const useOrientation = (): Orientation => {
  const [orientation, setOrientation] = useState<Orientation>(window.innerHeight > window.innerWidth ? "portrait" : "landscape");

  useEffect(() => {
    const handleResize = () => {
      setOrientation(window.innerHeight > window.innerWidth ? "portrait" : "landscape");
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return orientation;
};
