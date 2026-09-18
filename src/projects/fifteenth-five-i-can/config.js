export const FIFTEENTH_FIVE_I_CAN_ACTIVITY_TYPE = "fifteenth_five_i_can";
export const FIFTEENTH_FIVE_I_CAN_ACTIVITY_KEY = "fifteenth_five_i_can_2026";
export const FIFTEENTH_FIVE_I_CAN_ASSETS_BASE_URL = `https://assets.zice8.com/${FIFTEENTH_FIVE_I_CAN_ACTIVITY_TYPE}/${FIFTEENTH_FIVE_I_CAN_ACTIVITY_KEY}`;

export const ASSETS = {
  homeBackground: "24d0b163005b724f426d83bfcffa9ee7_2354314_750_1624.png",
  pageBackground: "9553676e49117725a68a2612e8a85122_2505384_750_1624.png",
  homeTitle: "0d0b9ca84ca2bd371b65c501ecf0b87f_12668_346_39.png",
  homeHero: "f8c9365f5f7bfdeec92404960c45100b_63935_496_297.png",
  homeSubtitle: "9e1b4d6abc80e4ba52d51a242c93067f_29493_325_79.png",
  homeButton: "469189e41b70647ea867327469f35f15_97246_580_90.png",
  quizCard: "abe26211608deab6102a052d727fcb50_20875_621_622.png",
  quizHeading: "984dd25d3ebc8c41efe2352b5935fcd9_33218_243_87.png",
  certificate: "7f360e9f81acdbe06a27c1bdc4677941_851184_583_815.png",
  certificateHeading: "396de029be057e28c751a5f79e89e081_35380_688_48.png",
};

const keywordArt = [
  "84da88d2712055c82cfb31386c0628a6_14989_150_44.png",
  "62b35ba13253201f58be15c8c86312bf_14621_150_44.png",
  "c98270ea51de59af3d135ce38b1a1678_15210_150_44.png",
  "a75d199c88ef35da6c94f693667e7b33_14844_149_43.png",
  "45c73588a0822b9cfce79e0856069cf4_14250_150_44.png",
  "edaa96aea310fa8b4984122eef10fc9f_14485_150_43.png",
  "af82aa0aea02b820c4522482a7c5dd0e_14028_150_43.png",
  "267ac996757b3b10f30ffc0d7fa3f9c1_14488_149_43.png",
  "26e1753e90a20d7e9339d1acf0f8cb83_15007_149_43.png",
  "bd9f75c75d1d627a0ed1f877d1b41d33_13924_150_43.png",
  "4bb0e23522ece9cb99286b8e909d4839_13866_150_43.png",
  "cb361ee032e5967e4c9f24e925564781_15491_149_44.png",
  "9d21bd5379725c81b909d7bdec0edd81_14168_149_43.png",
  "b5e0cf4128e65510e62e5d4f9a80fd74_15006_149_43.png",
  "b8377b091fb4c5b089e75e2b1896fcb7_15389_150_44.png",
  "757c7e9bb430fb2c6f9ffac44e71bd40_14622_150_43.png",
  "31eb47c6a099f472dd0c3ebb8aecf0ed_15335_150_44.png",
  "e9b58fdb184afa0af2c26ecffdc63fbc_14103_150_43.png",
];
const keywordCoordinates = [
  [183, 561],
  [35, 594],
  [14, 657],
  [39, 716],
  [5, 789],
  [49, 853],
  [334, 901],
  [137, 917],
  [39, 975],
  [222, 981],
  [392, 975],
  [505, 907],
  [579, 847],
  [541, 686],
  [556, 582],
  [534, 501],
  [392, 434],
  [215, 859],
];

export const KEYWORD_LAYOUT = keywordCoordinates.map(([x, y], index) => ({
  x,
  y,
  image: keywordArt[index],
}));

export function assetUrl(
  filename,
  baseUrl = FIFTEENTH_FIVE_I_CAN_ASSETS_BASE_URL,
) {
  if (!filename) return "";
  if (/^(https?:)?\/\//i.test(filename) || filename.startsWith("data:"))
    return filename;
  return `${String(baseUrl).replace(/\/$/, "")}/${filename.replace(/^\//, "")}`;
}

export function mergeConfig(publicConfig) {
  return {
    assetsBaseUrl: FIFTEENTH_FIVE_I_CAN_ASSETS_BASE_URL,
    ...(publicConfig?.mobileConfig || {}),
  };
}
