import { useState } from "react";
import { useNavigate } from "react-router-dom";
import NewConfessionDialog from "@/components/NewConfessionDialog";

const Compose = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      navigate("/");
    }
  };

  const handleConfessionCreated = () => {
    navigate("/");
  };

  return (
    <NewConfessionDialog 
      open={open} 
      onOpenChange={handleOpenChange}
      onConfessionCreated={handleConfessionCreated}
    />
  );
};

export default Compose;
