import { cn } from "@/lib/utils";

export function ArtistAvatar({ name, photo, className }: { name: string; photo?: string | null | undefined; className?: string | undefined }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
  return (
    <span className={cn("inline-grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-primary/40 bg-accent text-sm font-bold text-accent-foreground", className)}>
      {photo ? <img src={photo} alt={name} className="h-full w-full object-cover" loading="lazy" /> : initials}
    </span>
  );
}

/** Reads an image file and returns a small square JPEG data URL (fits offline storage). */
export async function resizePhoto(file: File, size = 256): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = url; });
    const s = Math.min(img.width, img.height);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    canvas.getContext("2d")?.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}
