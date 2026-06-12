import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type LocalGalleryPlayerProps = {
  width: number;
  height: number;
};

export function LocalGalleryPlayer({ width, height }: LocalGalleryPlayerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"video" | "audio" | null>(null);

  useEffect(() => {
    return () => {
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    };
  }, [mediaUrl]);

  const onPick = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
      const url = URL.createObjectURL(file);
      setMediaUrl(url);
      setMediaType(file.type.startsWith("audio/") ? "audio" : "video");
    },
    [mediaUrl],
  );

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-4 bg-black/90 p-4"
      style={{ width, height }}
    >
      <input ref={inputRef} type="file" accept="video/*,audio/*" className="hidden" onChange={onPick} />
      <Button type="button" variant="heroOutline" onClick={() => inputRef.current?.click()}>
        Elegir archivo MP3/MP4
      </Button>
      {mediaUrl && mediaType === "video" ? (
        <video src={mediaUrl} controls playsInline className="max-h-full max-w-full rounded-lg" />
      ) : null}
      {mediaUrl && mediaType === "audio" ? <audio src={mediaUrl} controls className="w-full" /> : null}
    </div>
  );
}
