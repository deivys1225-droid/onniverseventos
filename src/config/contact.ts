/** Correo oficial OnniVerso / Empresa Tecnológica de Colombia. */
export const OFFICIAL_EMAIL = "gerencia@onniverso.com";

export const mailtoOfficial = (subject: string) =>
  `mailto:${OFFICIAL_EMAIL}?subject=${encodeURIComponent(subject)}`;
