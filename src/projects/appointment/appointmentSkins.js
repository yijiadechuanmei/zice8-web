import {
  APPOINTMENT_FALLBACK_ASSETS_BASE_URL,
  APPOINTMENT_LAYOUT,
  APPOINTMENT_STAGE_HEIGHT,
  APPOINTMENT_STAGE_WIDTH,
  APPOINTMENT_SUCCESS_STAGE_HEIGHT,
} from './appointmentLayout'

export const DONGFANG_ZHENYUE_ACTIVITY_KEY = 'baoli-dongfang-zhenyue-delivery-20260621'

const DONGFANG_ZHENYUE_ASSETS_BASE_URL =
  'https://assets.zice8.com/appointment/baoli-dongfang-zhenyue-delivery-20260621'

const DONGFANG_ZHENYUE_LAYOUT = {
  common: {
    background: '98be13fdc7fe356a0a7c67a57322897b_1270758.webp',
    topBanner: {
      filename: '296833a85ca5a08a65d3cda58b8a1a73_6004.webp',
      left: 60,
      top: 43,
      width: 630,
      height: 41,
    },
    prevButton: APPOINTMENT_LAYOUT.common.prevButton,
    nextButton: APPOINTMENT_LAYOUT.common.nextButton,
  },
  intro: {
    height: APPOINTMENT_STAGE_HEIGHT,
    background: '98be13fdc7fe356a0a7c67a57322897b_1270758.webp',
    images: [
      {
        filename: '7da25e08620a00c81eb1065ed9440630_18419_631_208.png',
        left: 58,
        top: 205,
        width: 631,
        height: 208,
      },
      {
        filename: '5e169a7788f743be42ddbba25ea2c0fe_4066.webp',
        left: 107,
        top: 354,
        width: 66,
        height: 137,
      },
      {
        filename: '3026d5946916faec23ec18e57f5ed1fa_5706_544_133.png',
        left: 99,
        top: 470,
        width: 544,
        height: 133,
      },
      {
        filename: '59c23f8c18f4aa02f71eb9dc6fe6cbad_6857_357_231.png',
        left: 192,
        top: 718,
        width: 357,
        height: 231,
      },
      {
        filename: '3f9bcfe7ce91ec54c1b8c86fcff992f7_4548.webp',
        left: 297,
        top: 1155,
        width: 155,
        height: 56,
      },
    ],
    qrcodeBox: {
      left: 307,
      top: 1003,
      width: 132,
      height: 132,
    },
  },
  rule: {
    height: APPOINTMENT_STAGE_HEIGHT,
    background: '29c81089bf087ef57a859bf3de02262d_1251896.webp',
    images: [
      {
        filename: '33aea9c38921f6cbea83856c3be03a06_40448_587_855.png',
        left: 63,
        top: 230,
        width: 587,
        height: 855,
      },
      {
        filename: '0f4ee1df38d9c2f6491e2c3487eca098_5490.webp',
        left: 259,
        top: 1133,
        width: 221,
        height: 58,
        action: 'next',
      },
    ],
  },
  verify: {
    height: APPOINTMENT_STAGE_HEIGHT,
    background: '29c81089bf087ef57a859bf3de02262d_1251896.webp',
    titleImage: {
      filename: 'b7ede25130408870609acd8d337eb990_5716.webp',
      left: 156,
      top: 220,
      width: 428,
      height: 64,
    },
    fieldImages: [
      {
        filename: '342890ab6092689d4d37cf6d698ffdbe_5316.webp',
        left: 91,
        top: 352,
        width: 562,
        height: 140,
      },
      {
        filename: '47274b9e17f3051096413c2336fcd65a_5034.webp',
        left: 91,
        top: 527,
        width: 562,
        height: 140,
      },
      {
        filename: '9bcb551a2eb909ee44d55930bb427ac5_5820.webp',
        left: 91,
        top: 702,
        width: 562,
        height: 141,
      },
      {
        filename: '1797959991048745ff1284329ec9e692_5280.webp',
        left: 91,
        top: 878,
        width: 562,
        height: 140,
      },
    ],
    inputs: APPOINTMENT_LAYOUT.verify.inputs,
  },
  booking: {
    height: APPOINTMENT_STAGE_HEIGHT,
    background: '29c81089bf087ef57a859bf3de02262d_1251896.webp',
    titleImage: {
      filename: 'ec9b94d05d4f1afac2903a6322e7add5_5360.webp',
      left: 194,
      top: 225,
      width: 357,
      height: 64,
    },
    fieldImages: [
      {
        filename: 'a27c2614e2cc7d4dd4b6d06b851ba45c_6826.webp',
        left: 91,
        top: 348,
        width: 562,
        height: 140,
      },
      {
        filename: 'e3d6ed6a8da13508c579249253e2a169_6652.webp',
        left: 91,
        top: 528,
        width: 562,
        height: 140,
      },
      {
        filename: '7bb9f182dfe835c3f4133f980ddf9eb4_4998.webp',
        left: 91,
        top: 708,
        width: 563,
        height: 140,
      },
    ],
    controls: APPOINTMENT_LAYOUT.booking.controls,
  },
  success: {
    height: APPOINTMENT_SUCCESS_STAGE_HEIGHT,
    background: '29c81089bf087ef57a859bf3de02262d_1251896.webp',
    images: [
      {
        filename: 'f2997a96a60a9d0a986d786d7a2fada2_6388.webp',
        left: 156,
        top: 386,
        width: 431,
        height: 98,
      },
      {
        filename: 'ca5e06af6fe546199c1ce1eac1a4e4b0_6478.webp',
        left: 262,
        top: 982,
        width: 221,
        height: 58,
        action: 'confirm',
      },
    ],
    textBlocks: [
      {
        key: 'house',
        left: 65,
        top: 540,
        width: 620,
        height: 100,
        className: 'appointment-success-primary',
      },
      {
        key: 'desc',
        left: 65,
        top: 640,
        width: 620,
        height: 100,
        className: 'appointment-success-secondary',
        lines: ['您的预约时间为'],
      },
      {
        key: 'date-slot',
        left: 62,
        top: 740,
        width: 627,
        height: 148,
        className: 'appointment-success-tertiary',
      },
    ],
  },
}

const MINGZHOU_ZHENYUE_SKIN = {
  key: 'baoli-mingzhou-zhenyue-delivery',
  className: 'appointment-skin-mingzhou-zhenyue',
  assetsBaseUrl: APPOINTMENT_FALLBACK_ASSETS_BASE_URL,
  stageWidth: APPOINTMENT_STAGE_WIDTH,
  stageHeight: APPOINTMENT_STAGE_HEIGHT,
  layout: APPOINTMENT_LAYOUT,
}

const DONGFANG_ZHENYUE_SKIN = {
  key: 'baoli-dongfang-zhenyue-delivery',
  className: 'appointment-skin-dongfang-zhenyue',
  assetsBaseUrl: DONGFANG_ZHENYUE_ASSETS_BASE_URL,
  stageWidth: APPOINTMENT_STAGE_WIDTH,
  stageHeight: APPOINTMENT_STAGE_HEIGHT,
  layout: DONGFANG_ZHENYUE_LAYOUT,
}

export function resolveAppointmentSkin(activityKey) {
  if (String(activityKey || '') === DONGFANG_ZHENYUE_ACTIVITY_KEY) {
    return DONGFANG_ZHENYUE_SKIN
  }
  return MINGZHOU_ZHENYUE_SKIN
}
