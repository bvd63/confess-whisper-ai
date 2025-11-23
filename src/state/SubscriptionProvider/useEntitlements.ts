import { useContext } from "react";
import { SubscriptionContext } from "./types";

export const useEntitlements = () => useContext(SubscriptionContext);
