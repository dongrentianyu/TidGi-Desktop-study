import React from 'react';
import { useTranslation } from 'react-i18next';
import { Divider, List, ListItem, ListItemText } from '@material-ui/core';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';

import type { ISectionProps } from '../useSections';
import { Paper, SectionTitle } from '../PreferenceComponents';

import { WindowNames } from '@services/windows/WindowProperties';

export function Miscellaneous(props: ISectionProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <>
      <SectionTitle ref={props.sections.misc.ref}>{t('Preference.Miscellaneous')}</SectionTitle>
      <Paper elevation={0}>
        <List dense disablePadding>
          <ListItem button onClick={async () => await window.service.window.open(WindowNames.about)}>
            <ListItemText primary={t('ContextMenu.About')} />
            <ChevronRightIcon color="action" />
          </ListItem>
          <Divider />
          <ListItem button onClick={async () => await window.service.native.open('https://github.com/tiddly-gittly/TidGi-desktop/')}>
            <ListItemText primary={t('Preference.WebSite')} />
            <ChevronRightIcon color="action" />
          </ListItem>
          <Divider />
          <ListItem button onClick={async () => await window.service.native.open('https://github.com/tiddly-gittly/TidGi-desktop/issues')}>
            <ListItemText primary={t('Preference.Support')} />
            <ChevronRightIcon color="action" />
          </ListItem>
          <Divider />
          <ListItem button onClick={() => window.service.native.quit()}>
            <ListItemText primary={t('ContextMenu.Quit')} />
            <ChevronRightIcon color="action" />
          </ListItem>
        </List>
      </Paper>
    </>
  );
}
