export const APPOINTMENT_STAGE_WIDTH = 750
export const APPOINTMENT_STAGE_HEIGHT = 1448
export const APPOINTMENT_SUCCESS_STAGE_HEIGHT = 1206
export const APPOINTMENT_FALLBACK_ASSETS_BASE_URL =
  'https://assets.zice8.com/appointment/baoli-mingzhou-zhenyue-delivery-20260622'

export const APPOINTMENT_LAYOUT = {
  common: {
    background: '01dff47d9d2371506e54144ec86971f0_282999_751_1625.png',
    topBanner: {
      filename: 'b28446a42bf6989d7f5b29046eed72a7_1944_623_36.png',
      left: 60,
      top: 49,
      width: 623,
      height: 36,
    },
    prevButton: {
      filename: '3398c392a7d2b30cb8fe7ac97e253e4f_1528_222_58.png',
      left: 114,
      top: 1090,
      width: 222,
      height: 59,
    },
    nextButton: {
      filename: '22a4da3a18e146dbac2488feccdc3da2_1673_221_58.png',
      left: 407,
      top: 1090,
      width: 221,
      height: 59,
    },
  },
  intro: {
    height: APPOINTMENT_STAGE_HEIGHT,
    images: [
      {
        filename: '8f024701417354c539e39097e0e682ad_22912_560_188.png',
        left: 92,
        top: 150,
        width: 560,
        height: 188,
      },
      {
        filename: '1ca449f464ee32c4ab690d5274f5dfbb_557_118_18.png',
        left: 312,
        top: 398,
        width: 118,
        height: 18,
      },
      {
        filename: 'be7173b09c130aa03760536a714ee9fa_19909_348_178.png',
        left: 196,
        top: 472,
        width: 348,
        height: 178,
      },
      {
        filename: '8f340aaf3594180776f1da9f7d233dae_22877_362_226.png',
        left: 189,
        top: 714,
        width: 362,
        height: 226,
      },
      {
        filename: '5f1448bb7a610a1eecbb2e53a033109b_1745_155_216.png',
        left: 295,
        top: 997,
        width: 155,
        height: 216,
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
    images: [
      {
        filename: 'b178b97d3594d2f6776ed33e90ea18a8_67030_628_831.png',
        left: 58,
        top: 184,
        width: 628,
        height: 831,
      },
      {
        filename: '4d08ba00e32fac92c7dd171992244add_1754_221_58.png',
        left: 260,
        top: 1121,
        width: 221,
        height: 58,
      },
    ],
  },
  verify: {
    height: APPOINTMENT_STAGE_HEIGHT,
    titleImage: {
      filename: '96dc1a51c52ae3f09048f24a2bd9ea68_2822_428_65.png',
      left: 158,
      top: 225,
      width: 428,
      height: 64,
    },
    fieldImages: [
      {
        filename: 'e87e4ef14dc6a45c2d87adfbb1f9369a_2031_563_141.png',
        left: 92,
        top: 351,
        width: 563,
        height: 141,
      },
      {
        filename: '8c58ed4a9f05f96c9d5f20fde5d09a24_1800_563_141.png',
        left: 92,
        top: 527,
        width: 563,
        height: 141,
      },
      {
        filename: 'ea1c6c313530238281a6c96707fd9473_2433_563_140.png',
        left: 92,
        top: 702,
        width: 563,
        height: 141,
      },
      {
        filename: 'b7bd4376e5f4dd5e21b0f54e5879246d_1907_562_141.png',
        left: 91,
        top: 878,
        width: 562,
        height: 140,
      },
    ],
    inputs: {
      building: { left: 93, top: 429, width: 558, height: 64, maxLength: 10, inputMode: 'numeric' },
      room: { left: 93, top: 605, width: 558, height: 64, maxLength: 10, inputMode: 'numeric' },
      name: { left: 95, top: 782, width: 558, height: 64, maxLength: 32 },
      idTail: { left: 93, top: 957, width: 558, height: 64, maxLength: 4, inputMode: 'numeric' },
    },
  },
  booking: {
    height: APPOINTMENT_STAGE_HEIGHT,
    titleImage: {
      filename: 'c8eb40ca5aa36215d5a154f07781c3e2_2408_357_64.png',
      left: 194,
      top: 220,
      width: 357,
      height: 64,
    },
    fieldImages: [
      {
        filename: '9dbfcff82a6689974092bee8d73ef189_1527_563_140.png',
        left: 91,
        top: 348,
        width: 562,
        height: 140,
      },
      {
        filename: '9c0ff9ae6e889e5d606d8bb95d17deb2_1563_563_140.png',
        left: 91,
        top: 528,
        width: 562,
        height: 140,
      },
      {
        filename: '5f2b7ccd0decf39e8576a81a4df67785_1558_564_140.png',
        left: 91,
        top: 708,
        width: 562,
        height: 140,
      },
    ],
    controls: {
      appointmentDate: { left: 93, top: 423, width: 558, height: 64 },
      appointmentSlot: { left: 93, top: 605, width: 558, height: 64 },
      phone: { left: 93, top: 784, width: 558, height: 64, maxLength: 11, inputMode: 'numeric' },
    },
  },
  success: {
    height: APPOINTMENT_SUCCESS_STAGE_HEIGHT,
    images: [
      {
        filename: '132a93c3426e01c133c93fc578695a19_6422.webp',
        left: 155,
        top: 383,
        width: 431,
        height: 98,
      },
      {
        filename: 'ca5e06af6fe546199c1ce1eac1a4e4b0_6478.webp',
        left: 262,
        top: 982,
        width: 221,
        height: 58,
      },
    ],
    textBlocks: [
      {
        key: 'house',
        left: 65,
        top: 563,
        width: 620,
        height: 100,
        className: 'appointment-success-primary',
      },
      {
        key: 'desc',
        left: 65,
        top: 660,
        width: 620,
        height: 100,
        className: 'appointment-success-secondary',
        lines: ['您的预约时间为'],
      },
      {
        key: 'date-slot',
        left: 62,
        top: 758,
        width: 627,
        height: 148,
        className: 'appointment-success-tertiary',
      },
    ],
  },
}
