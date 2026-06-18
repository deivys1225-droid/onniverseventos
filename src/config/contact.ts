/** Correo oficial OnniVerso / Empresa Tecnológica de Colombia. */
export const OFFICIAL_EMAIL = "gerencia@onnivers.online";

export const mailtoOfficial = (subject: string) =>
  `mailto:${OFFICIAL_EMAIL}?subject=${encodeURIComponent(subject)}`;
