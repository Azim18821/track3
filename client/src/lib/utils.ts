import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export const hasMessagingAccess = (user: any) => {
  return user?.isTrainer || user?.hasTrainer;
};
