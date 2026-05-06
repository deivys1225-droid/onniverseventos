import imageCompression from "browser-image-compression";

/** Comprime la foto de perfil para subidas ligeras (datos móviles). */
export async function compressProfileImage(file: File): Promise<File> {
  const centeredSquare = await createCenteredSquareAvatar(file);
  const compressed = await imageCompression(centeredSquare, {
    maxSizeMB: 0.12,
    maxWidthOrHeight: 720,
    useWebWorker: true,
    initialQuality: 0.82,
    fileType: "image/jpeg",
  });
  return compressed;
}

async function createCenteredSquareAvatar(file: File): Promise<File> {
  const image = await readImage(file);
  const side = Math.min(image.naturalWidth || image.width, image.naturalHeight || image.height);
  const sx = Math.max(0, ((image.naturalWidth || image.width) - side) / 2);
  const sy = Math.max(0, ((image.naturalHeight || image.height) - side) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar el recorte de la imagen.");
  ctx.drawImage(image, sx, sy, side, side, 0, 0, side, side);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) throw new Error("No se pudo convertir la imagen recortada.");
  return new File([blob], "avatar-cropped.jpg", { type: "image/jpeg", lastModified: Date.now() });
}

async function readImage(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
