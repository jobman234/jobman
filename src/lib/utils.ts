import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const VIDEO_EXTENSION_REGEX = /\.(mp4|mov|webm|avi|mkv|m4v)(\?|$)/i;

export function isVideoUrl(url: string): boolean {
  return VIDEO_EXTENSION_REGEX.test(url);
}
