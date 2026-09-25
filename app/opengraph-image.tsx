import { brandOpenGraphImage } from "@/lib/brand-og";

export { alt, size, contentType } from "@/lib/brand-og";
export const runtime = "nodejs";

export default async function Image() {
  return brandOpenGraphImage();
}
