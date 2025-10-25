// import { useOffline } from "@/hooks/useOffline";
// import { usePerformanceBudget } from "@/hooks/usePerformanceBudget";
import App from "@/App";
// import PerformanceDashboard from "@/components/PerformanceDashboard";

/**
 * App wrapper component that handles offline detection and performance monitoring
 */
const AppWrapper = () => {
  // Monitor online/offline status
  // useOffline();
  
  // Monitor performance budget (p95 < 200ms)
  // usePerformanceBudget();

  return (
    <>
      <App />
      {/* <PerformanceDashboard /> */}
    </>
  );
};

export default AppWrapper;
