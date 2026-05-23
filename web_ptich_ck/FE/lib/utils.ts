import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
    let s = text.toLowerCase().trim();
    s = s.replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a");
    s = s.replace(/[èéẹẻẽêềếệểễ]/g, "e");
    s = s.replace(/[ìíịỉĩ]/g, "i");
    s = s.replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o");
    s = s.replace(/[ùúụủũưừứựửữ]/g, "u");
    s = s.replace(/[ỳýỵỷỹ]/g, "y");
    s = s.replace(/đ/g, "d");
    s = s.replace(/[^a-z0-9]+/g, "_");
    s = s.replace(/^_+|_+$/g, "");
    return s || "unknown";
}
