import {
  APPOINTMENT_FALLBACK_ASSETS_BASE_URL,
  APPOINTMENT_LAYOUT,
  APPOINTMENT_STAGE_HEIGHT,
  APPOINTMENT_STAGE_WIDTH,
} from './appointmentLayout'

export const DONGFANG_ZHENYUE_ACTIVITY_KEY = 'baoli_dongfang_zhenyue_delivery_20260621'
export const DONGFANG_ZHENYUE_LEGACY_ACTIVITY_KEY = 'baoli-dongfang-zhenyue-delivery-20260621'
export const DONGFANG_ZHENYUE_JULY_ACTIVITY_KEY = 'baoli_dongfang_zhenyue_july_delivery_20260718'

const DONGFANG_ZHENYUE_ASSETS_BASE_URL =
  'https://assets.zice8.com/appointment/baoli-dongfang-zhenyue-delivery-20260621'

const DONGFANG_ZHENYUE_JULY_ASSETS_BASE_URL =
  'https://assets.zice8.com/appointment/baoli_dongfang_zhenyue_july_delivery_20260718'

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
        filename: '0516a8b1b2fed854e36378c318e462ae_13604_527_62.png',
        left: 109,
        top: 217,
        width: 527,
        height: 62,
      },
      {
        filename: '5e169a7788f743be42ddbba25ea2c0fe_4066.webp',
        left: 105,
        top: 325,
        width: 66,
        height: 137,
      },
      {
        filename: 'ba821dbed8b7eb62cec259459447aa17_1676_204_48.png',
        left: 269,
        top: 325,
        width: 204,
        height: 48,
      },
      {
        filename: '0acf7c199e1a50e37156d42dd28d0d72_6116_548_131.png',
        left: 97,
        top: 491,
        width: 548,
        height: 131,
      },
      {
        filename: 'c866979d3a97cde1758744190618f7cb_4933_356_128.png',
        left: 193,
        top: 729,
        width: 356,
        height: 128,
      },
      {
        filename: '370c75fbf7652ac99ee586fe482e6d83_996_147_31.png',
        left: 300,
        top: 1157,
        width: 147,
        height: 31,
      },
    ],
    qrcodeBox: {
      left: 307,
      top: 1003,
      width: 132,
      height: 132,
    },
    textHint: {
      text: '点击或上滑进入下一页',
      left: 221,
      top: 1210,
      width: 300,
      height: 38,
    },
  },
  rule: {
    height: APPOINTMENT_STAGE_HEIGHT,
    background: '29c81089bf087ef57a859bf3de02262d_1251896.webp',
    images: [
      {
        filename: '111-8.png',
        left: 66,
        top: 220,
        width: 607,
        height: 856,
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
    height: APPOINTMENT_STAGE_HEIGHT,
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

const DONGFANG_ZHENYUE_JULY_LAYOUT = {
  ...DONGFANG_ZHENYUE_LAYOUT,
  intro: {
    height: APPOINTMENT_STAGE_HEIGHT,
    background: '98be13fdc7fe356a0a7c67a57322897b_1270758.webp',
    images: [
      {
        filename: '5e169a7788f743be42ddbba25ea2c0fe_4066.webp',
        left: 107,
        top: 312,
        width: 66,
        height: 137,
      },
      {
        filename: '111aeac15948e77efd8cf9d70c85ab24_2563_284_60.png',
        left: 231,
        top: 1156,
        width: 284,
        height: 60,
      },
      {
        filename: 'ca6000727e9b81de26111ae7e2fe5319_16041_648_113.png',
        left: 47,
        top: 193,
        width: 648,
        height: 113,
      },
      {
        filename: 'cab0a5ebf9bcdd5adf4981d4d2216d9e_5753_556_131.png',
        left: 91,
        top: 486,
        width: 556,
        height: 131,
      },
      {
        filename: '3bcddd73bf9acb755fc058b936fbe743_9063_502_180.png',
        left: 119,
        top: 720,
        width: 502,
        height: 180,
      },
      {
        filename: '517903c86adb390a93a08156063636ff_1682_204_48.png',
        left: 269,
        top: 348,
        width: 204,
        height: 48,
      },
    ],
    qrcodeBox: {
      left: 307,
      top: 1003,
      width: 132,
      height: 132,
    },
  },
  introduction: {
    height: APPOINTMENT_STAGE_HEIGHT,
    background: '29c81089bf087ef57a859bf3de02262d_1251896.webp',
    images: [
      {
        filename: 'e56543e24e99ac9b875728e3512862b1_41726_607_799.png',
        left: 65,
        top: 232,
        width: 607,
        height: 799,
      },
      {
        filename: '0f4ee1df38d9c2f6491e2c3487eca098_5490.webp',
        left: 259,
        top: 1140,
        width: 221,
        height: 58,
        action: 'next',
      },
    ],
  },
  rule: {
    height: APPOINTMENT_STAGE_HEIGHT,
    background: '29c81089bf087ef57a859bf3de02262d_1251896.webp',
    images: [
      {
        filename: '2331146ac4c1eb8887768a467cf54f1c_33384_607_743.png',
        left: 66,
        top: 230,
        width: 607,
        height: 743,
      },
      {
        filename: '0f4ee1df38d9c2f6491e2c3487eca098_5490.webp',
        left: 259,
        top: 1140,
        width: 221,
        height: 58,
        action: 'next',
      },
    ],
  },
  booking: {
    ...DONGFANG_ZHENYUE_LAYOUT.booking,
    fixedAllowedDate: true,
    fieldImages: [
      {
        filename: '89218ac7f7da109aba0a20812c6a9e45_2479_480_119.png',
        left: 91,
        top: 348,
        width: 562,
        height: 140,
      },
      {
        filename: '37ea2528839e5c72e33a0071d366db81_2455_480_120.png',
        left: 91,
        top: 528,
        width: 562,
        height: 140,
      },
      DONGFANG_ZHENYUE_LAYOUT.booking.fieldImages[2],
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

const DONGFANG_ZHENYUE_JULY_SKIN = {
  key: 'baoli-dongfang-zhenyue-july-delivery',
  className: 'appointment-skin-dongfang-zhenyue',
  assetsBaseUrl: DONGFANG_ZHENYUE_JULY_ASSETS_BASE_URL,
  stageWidth: APPOINTMENT_STAGE_WIDTH,
  stageHeight: APPOINTMENT_STAGE_HEIGHT,
  layout: DONGFANG_ZHENYUE_JULY_LAYOUT,
}

export function resolveAppointmentSkin(activityKey) {
  const normalizedActivityKey = normalizeAppointmentActivityKey(activityKey)
  if (normalizedActivityKey === DONGFANG_ZHENYUE_JULY_ACTIVITY_KEY) {
    return DONGFANG_ZHENYUE_JULY_SKIN
  }
  if (normalizedActivityKey === DONGFANG_ZHENYUE_ACTIVITY_KEY) {
    return DONGFANG_ZHENYUE_SKIN
  }
  return MINGZHOU_ZHENYUE_SKIN
}

export function normalizeAppointmentActivityKey(activityKey) {
  const key = String(activityKey || '')
  if (key === DONGFANG_ZHENYUE_LEGACY_ACTIVITY_KEY) return DONGFANG_ZHENYUE_ACTIVITY_KEY
  return key
}
