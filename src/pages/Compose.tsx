import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import NewConfessionDialog from "@/components/NewConfessionDialog";

const Compose = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(true);
  const initialCommunityId = (location.state as { communityId?: string })?.communityId;

  // Close dialog and navigate away when location changes away from /compose
  useEffect(() => {
    if (location.pathname !== "/compose" && open) {
      setOpen(false);
    }
  }, [location.pathname, open]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      navigate("/");
    }
  };

  const handleConfessionCreated = () => {
    setOpen(false);
    navigate("/");
  };

  return (
    <NewConfessionDialog 
      open={open} 
      onOpenChange={handleOpenChange}
      onConfessionCreated={handleConfessionCreated}
      initialCommunityId={initialCommunityId}
    />
  );
};

export default Compose;
