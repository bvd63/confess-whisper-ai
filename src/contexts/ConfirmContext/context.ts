import { createContext } from "react";

export type ConfirmVariant = "default" | "warning" | "danger";

export interface ConfirmOptions {
  titleKey: string;
  messageKey: string;
  variant?: ConfirmVariant;
  confirmTextKey?: string;
  cancelTextKey?: string;
}

export interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

export interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  resolve: (value: boolean) => void;
}

export const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);
