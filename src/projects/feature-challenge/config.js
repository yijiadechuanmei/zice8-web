export const FEATURE_CHALLENGE_ACTIVITY_TYPE = "feature_challenge";
export const FEATURE_CHALLENGE_ACTIVITY_KEY = "feature_challenge_20260718";
export const FEATURE_CHALLENGE_ASSETS_BASE_URL =
  "https://assets.zice8.com/feature_challenge/feature_challenge_20260718";

export const DEFAULT_CONFIG = {
  assetsBaseUrl: FEATURE_CHALLENGE_ASSETS_BASE_URL,
  homeBackgroundImage: "9802f99d4af812c226c8d7a301049b14_1834416_750_1624.png",
  homeDividerImage: "d4e6852ee2c51167dbae17a9fdd4ac41_52341_486_53.png",
  homeButtonImage: "7730cff739e436ba046aa1329764bfab_107835_442_121.png",
  homeTitleImage: "4ca4cdcdc76d5a5d4ca6613fd3c8dc32_173026_620_257.png",
  homeIllustrationImage: "66b626afd7c2b5d4ed176289860b1bc5_732491_649_644.png",
  quizBackgroundImage: "feature-challenge-quiz-bg.png",
};

export function mergeConfig(publicConfig) {
  return {
    ...DEFAULT_CONFIG,
    ...(publicConfig?.mobileConfig || {}),
  };
}

export function assetUrl(baseUrl, filename) {
  if (!filename) return "";
  if (
    /^(https?:)?\/\//i.test(filename) ||
    filename.startsWith("/") ||
    filename.startsWith("data:")
  )
    return filename;
  return `${String(baseUrl || "").replace(/\/$/, "")}/${filename.replace(/^\//, "")}`;
}
