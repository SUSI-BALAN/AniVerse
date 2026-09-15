import { ImageOff } from "lucide-react";
import { useEffect, useState } from "react";

type AnimeImageProps = {
  src: string | null;
  alt: string;
  className?: string;
  eager?: boolean;
};

export function AnimeImage({ src, alt, className = "", eager = false }: AnimeImageProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-zinc-900 text-zinc-600 ${className}`} role={alt ? "img" : undefined} aria-hidden={!alt || undefined} aria-label={alt ? `${alt} image unavailable` : undefined}>
        <ImageOff size={30} aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
