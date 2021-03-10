import path from 'path';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import isDevelopment from 'electron-is-dev';

import { LOCALIZATION_FOLDER } from '@services/constants/paths';
import changeToDefaultLanguage from './useDefaultLanguage';
import { mainBindings } from './i18nMainBindings';

// init i18n is async, but our usage is basically await the electron app to start, so this is basically ok
void i18next.use(Backend).init({
  backend: {
    loadPath: path.join(LOCALIZATION_FOLDER, 'locales/{{lng}}/{{ns}}.json'),
    addPath: path.join(LOCALIZATION_FOLDER, 'locales/{{lng}}/{{ns}}.missing.json'),
  },

  debug: false,
  interpolation: { escapeValue: false },
  saveMissing: isDevelopment,
  saveMissingTo: 'current',
  // namespace: 'translation',
  lng: 'zh_CN',
  fallbackLng: isDevelopment ? false : 'en', // set to false when generating translation files locally
});

export async function initRendererI18NHandler(): Promise<void> {
  mainBindings();
  await changeToDefaultLanguage(i18next);
}

export default i18next;
