import { useState, useEffect } from "react";

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Check if the screen is mobile-sized initially
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024); // Using lg breakpoint (1024px)
    };
    
    // Check immediately
    checkIsMobile();
    
    // Add event listener for window resize
    window.addEventListener("resize", checkIsMobile);
    
    // Cleanup
    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, []);
  
  return isMobile;
}