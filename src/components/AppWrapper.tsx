import { useOffline } from "@/hooks/useOffline";
import App from "@/App";

/**
 * App wrapper component that handles offline detection
 */
const AppWrapper = () => {
  // Monitor online/offline status
  useOffline();

  return <App />;
};

export default AppWrapper;
