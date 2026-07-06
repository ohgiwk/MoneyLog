import type { CapacitorConfig } from '@capacitor/cli'
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard'

const config: CapacitorConfig = {
  appId: 'com.keiya.moneylog',
  appName: 'マネログ',
  webDir: 'dist',
  plugins: {
    Keyboard: {
      resize: KeyboardResize.None,
      style: KeyboardStyle.Dark,
      autoBackdropColor: 'auto',
    },
  },
}

export default config
