/**
 * MP4 de Cloudinary por id de sala (perfil podcast o ruta teatro).
 * Único origen para Nuestras Salas y deep links de reproducción.
 */
export const SALA_MP4_URL_BY_ID: Record<string, string> = {
  "prueba-livepeer": "https://livepeercdn.studio/hls/ee47aozdn2c6kg5j/index.m3u8",
  "nova-byte":
    "https://res.cloudinary.com/dfsabdxup/video/upload/v1777737430/karol_eund2g.mp4",
  "axon-king":
    "https://res.cloudinary.com/dfsabdxup/video/upload/v1777748643/Silvestre_hxjmdi.mp4",
  "westcol":
    "https://res.cloudinary.com/dfsabdxup/video/upload/v1777751404/AS%C3%8D_QUED%C3%93_MI_G_WAGON_REFORMADA_LUJOSA_EN_MEDELL%C3%8DN___WESTCOL_gucqxx.mp4",
  alofoke:
    "https://res.cloudinary.com/dfsabdxup/video/upload/v1777751455/MICHAEL_FLORES_X_ALOFOKE_MUSIC_X_JEY_ONE_X_YOVANI_VASQUEZ_-_PODCATERA_qotzfz.mp4",
  "anuel-aa":
    "https://res.cloudinary.com/dfsabdxup/video/upload/v1777751466/Anuel_en_vivo_que_nos_pas%C3%B3_mujrd0.mp4",
  "santa-fe-klan":
    "https://res.cloudinary.com/dfsabdxup/video/upload/v1777751492/Santa_Fe_Klan_-_Velorios_Video_Oficial_ovnftc.mp4",
  shakira:
    "https://res.cloudinary.com/dfsabdxup/video/upload/v1777751493/Shakira_-_MTV_Video_Vanguard_Performance_-_Live_on_The_2023_MTV_Video_Music_Awards_h6jzy5.mp4",
  "j-balvin":
    "https://res.cloudinary.com/dfsabdxup/video/upload/v1777751506/57_-_JBalvin_-_Ciudad_Primavera_C%C3%BAcuta_11_Abril_2026_tlyhcw.mp4",
  "franco-escamilla":
    "https://res.cloudinary.com/dfsabdxup/video/upload/v1777751512/Franco_Escamilla.-_Mon%C3%B3logo__Ol%C3%ADmpicos_de_Invierno__hmo9ss.mp4",
  arcangel:
    "https://res.cloudinary.com/dfsabdxup/video/upload/v1777757206/Arcangel_Bad_Bunny_-_La_Jumpa_Video_Oficial___SR._SANTOS_tkd2gl.mp4",
  beele:
    "https://res.cloudinary.com/dfsabdxup/video/upload/v1777757253/BE%C3%89LE_-_LA_PLENA_EN_VIVO_hamldd.mp4",
  "selena-quintanilla":
    "https://res.cloudinary.com/dfsabdxup/video/upload/v1777757336/Selena_-_Bidi_Bidi_Bom_Bom_hcvcfk.mp4",
  xavi: "https://res.cloudinary.com/dfsabdxup/video/upload/v1777757372/Xavi_Manuel_Turizo_-_En_Privado_Official_Video_elhacp.mp4",
  "daddy-yankee":
    "https://res.cloudinary.com/dfsabdxup/video/upload/v1777757419/Daddy_Yankee_-_Homenaje_Premios_lo_Nuestro_2019_yvgwjk.mp4",
  "bad-bunny":
    "https://res.cloudinary.com/dfsabdxup/video/upload/v1777757420/Bad_Bunny_s_Apple_Music_Super_Bowl_Halftime_Show_jfvgow.mp4",
  "luisito-comunica-er":
    "https://res.cloudinary.com/dfsabdxup/video/upload/v1777988737/equirectangular_2_luisito_comunica_xyrcqp.mp4",
  "vr-360":
    "https://res.cloudinary.com/dfsabdxup/video/upload/v1778033836/360_Airline_Pilot_s_View___Miami_-_Bahamas___American_Eagle_E-175_gegade.mp4",
  "gopro-gpy":
    "https://res.cloudinary.com/dfsabdxup/video/upload/v1778011486/gopro_1_jyzdtl.mp4",
  "red-bull-f1-er":
    "https://res.cloudinary.com/dfsabdxup/video/upload/v1778033653/Red_Bull_ER_1080P_w9h3e4.mp4",
  "mount-everest":
    "https://res.cloudinary.com/dfsabdxup/video/upload/v1778033844/360_video_trailer_in_8K_na7mu0.mp4",
  "michael-jackson":
    "https://res.cloudinary.com/dfsabdxup/video/upload/v1777757437/Michael_Jackson_-_Billie_Jean_-_Live_Munich_1997_-_Widescreen_HD_gei36m.mp4",
  "hablando-huevadas":
    "https://res.cloudinary.com/dfsabdxup/video/upload/v1777757434/TE_AMO..._PERO_COMO_AMIGO_-_CLIP_RESCATANDO_HUEVADAS_osecn9.mp4",
};

export function onniverseDeepLink(mp4Url: string): string {
  return `onniverso://open?url=${encodeURIComponent(mp4Url)}`;
}

const APP_LINK_BASE = "https://vivevr.vercel.app";

export function livePlaybackAppLink(playbackId: string): string {
  return `${APP_LINK_BASE}/live/${encodeURIComponent(playbackId)}`;
}
