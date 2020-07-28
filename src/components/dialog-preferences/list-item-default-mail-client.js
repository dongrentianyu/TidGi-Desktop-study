import React, { useState, useEffect, useCallback } from 'react';
import semver from 'semver';

import Button from '@material-ui/core/Button';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';

import ChevronRightIcon from '@material-ui/icons/ChevronRight';

import connectComponent from '../../helpers/connect-component';

import { requestOpen } from '../../senders';

const ListItemDefaultMailClient = () => {
  const [isDefault, setIsDefault] = useState(false);

  const isWindows10 = window.remote.getPlatform() === 'win32' && semver.gt(window.remote.getOSVersion(), '10.0.0');

  const recheckIsDefault = useCallback(
    () => {
      // Electron protocol API doesn't work with Windows 10
      // So check with regedit
      if (isWindows10) {
        // https://stackoverflow.com/questions/32354861/how-to-find-the-default-browser-via-the-registry-on-windows-10
        const protocolName = 'mailto';
        const userChoicePath = `HKCU\\SOFTWARE\\Microsoft\\Windows\\Shell\\Associations\\URLAssociations\\${protocolName}\\UserChoice`;
        window.remote.regedit.list([userChoicePath], (err, result) => {
          try {
            setIsDefault(!err && result[userChoicePath].values.ProgId.value === 'TiddlyGit');
          } catch (tryErr) {
            // eslint-disable-next-line no-console
            console.log(tryErr);
            setIsDefault(false);
          }
        });
        return;
      }

      setIsDefault(window.remote.isDefaultProtocolClient('mailto'));
    },
    [isWindows10],
  );

  // recheck every 1 minutes
  useEffect(() => {
    recheckIsDefault();
    const timer = setInterval(() => {
      recheckIsDefault();
    }, 60 * 1000);
    return () => {
      clearInterval(timer);
    };
  }, [recheckIsDefault]);

  if (isDefault) {
    return (
      <ListItem>
        <ListItemText secondary="TiddlyGit is your default email client." />
      </ListItem>
    );
  }

  // open ms-settings on Windows 10
  // as Windows 10 doesn't allow changing default app programmatically
  if (isWindows10) {
    return (
      // https://docs.microsoft.com/en-us/windows/uwp/launch-resume/launch-settings-app
      <ListItem button onClick={() => requestOpen('ms-settings:defaultapps')}>
        <ListItemText primary="Default email client" secondary="Make TiddlyGit the default email client." />
        <ChevronRightIcon color="action" />
      </ListItem>
    );
  }

  return (
    <ListItem>
      <ListItemText primary="Default email client" secondary="Make TiddlyGit the default email client." />
      <Button
        variant="outlined"
        size="small"
        color="default"
        onClick={() => {
          window.remote.setAsDefaultProtocolClient('mailto');
          recheckIsDefault();
        }}
      >
        Make default
      </Button>
    </ListItem>
  );
};

export default connectComponent(
  ListItemDefaultMailClient,
  null,
  null,
  null,
);
