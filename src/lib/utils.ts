import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    throw new Error('Clipboard API unavailable');
  } catch (err) {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;

      // Prevent scrolling to bottom
      textArea.style.position = "fixed";
      textArea.style.left = "0";
      textArea.style.top = "0";
      textArea.style.opacity = "0";
      textArea.style.fontSize = "16px"; // Prevent zooming on iOS

      document.body.appendChild(textArea);
      textArea.focus();

      // Select text - robust method for mobile/iOS
      textArea.select();
      textArea.setSelectionRange(0, 99999);

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (!successful) throw new Error('execCommand failed');
      return true;
    } catch (fallbackErr) {
      console.error('Failed to copy', fallbackErr);
      return false;
    }
  }
}
