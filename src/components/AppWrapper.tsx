import { useOffline } from "@/hooks/useOffline";
import App from "@/App";
import PerformanceDashboard from "@/components/PerformanceDashboard";

/**
 * App wrapper component that handles offline detection and performance monitoring
 */
const AppWrapper = () => {
  // Monitor online/offline status
  useOffline();

  return (
    <>
      <App />
      <PerformanceDashboard />
    </>
  );
};

export default AppWrapper;
