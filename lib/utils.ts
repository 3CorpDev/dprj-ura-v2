import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Função para ajustar data para GMT-3
export function adjustToGMTMinus3(date: Date): Date {
  const adjustedDate = new Date(date);
  adjustedDate.setHours(adjustedDate.getHours() - 3);
  return adjustedDate;
}