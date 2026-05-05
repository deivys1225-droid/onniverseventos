import imageCompression from "browser-image-compression";

/** Comprime la foto de perfil para subidas ligeras (datos móviles). */
export async function compressProfileImage(file: File): Promise<File> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.12,
    maxWidthOrHeight: 720,
    useWebWorker: true,
    initialQuality: 0.82,
    fileType: "image/jpeg",
  });
  return compressed;
}
