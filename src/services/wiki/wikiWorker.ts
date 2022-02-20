import 'source-map-support/register';
import { expose } from 'threads/worker';
import path from 'path';
import { TiddlyWiki, type ITiddlyWiki } from '@tiddlygit/tiddlywiki';
import { Observable } from 'rxjs';
import intercept from 'intercept-stdout';
import { Server } from 'http';
import { fork } from 'child_process';
import { tmpdir } from 'os';
import { mkdtemp, writeFile } from 'fs-extra';

import { fixPath } from '@services/libs/fixPath';
import { IWikiMessage, WikiControlActions, ZxWorkerControlActions, IZxWorkerMessage } from './interface';
import { defaultServerIP } from '@/constants/urls';
import { executeScriptInTWContext, extractTWContextScripts, getTWVmContext } from './plugin/zxPlugin';

fixPath();
let wikiInstance: ITiddlyWiki | undefined;

function startNodeJSWiki({
  homePath,
  tiddlyWikiHost = defaultServerIP,
  tiddlyWikiPort = 5112,
  userName,
}: {
  homePath: string;
  tiddlyWikiHost: string;
  tiddlyWikiPort: number;
  userName: string;
}): Observable<IWikiMessage> {
  return new Observable<IWikiMessage>((observer) => {
    observer.next({ type: 'control', actions: WikiControlActions.start });
    intercept(
      (newStdOut: string) => {
        observer.next({ type: 'stdout', message: newStdOut });
      },
      (newStdError: string) => {
        observer.next({ type: 'control', source: 'intercept', actions: WikiControlActions.error, message: newStdError });
      },
    );

    try {
      wikiInstance = TiddlyWiki();
      process.env.TIDDLYWIKI_PLUGIN_PATH = path.resolve(homePath, 'plugins');
      process.env.TIDDLYWIKI_THEME_PATH = path.resolve(homePath, 'themes');
      // add tiddly filesystem back https://github.com/Jermolene/TiddlyWiki5/issues/4484#issuecomment-596779416
      wikiInstance.boot.argv = [
        '+plugins/tiddlywiki/filesystem',
        '+plugins/tiddlywiki/tiddlyweb',
        // '+plugins/linonetwo/watch-fs',
        homePath,
        '--listen',
        `anon-username=${userName}`,
        `port=${tiddlyWikiPort}`,
        `host=${tiddlyWikiHost}`,
        'root-tiddler=$:/core/save/lazy-images',
      ];
      wikiInstance.hooks.addHook('th-server-command-post-start', function (listenCommand, server: Server) {
        server.on('error', function (error) {
          observer.next({ type: 'control', actions: WikiControlActions.error, message: error.message });
        });
        server.on('listening', function () {
          observer.next({
            type: 'control',
            actions: WikiControlActions.booted,
            message: `Tiddlywiki booted at http://${tiddlyWikiHost}:${tiddlyWikiPort} (webview uri ip may be different, being getLocalHostUrlWithActualIP()) with args ${
              wikiInstance !== undefined ? wikiInstance.boot.argv.join(' ') : '(wikiInstance is undefined)'
            }`,
          });
        });
      });
      wikiInstance.boot.startup({});
    } catch (error) {
      const message = `Tiddlywiki booted failed with error ${(error as Error).message} ${(error as Error).stack ?? ''}`;
      observer.next({ type: 'control', source: 'try catch', actions: WikiControlActions.error, message });
    }
  });
}

export type IZxFileInput = { fileContent: string; fileName: string } | { filePath: string };
function executeZxScript(file: IZxFileInput, zxPath: string): Observable<IZxWorkerMessage> {
  /** this will be observed in src/services/native/index.ts */
  return new Observable<IZxWorkerMessage>((observer) => {
    observer.next({ type: 'control', actions: ZxWorkerControlActions.start });

    void (async function executeZxScriptIIFE() {
      try {
        let filePathToExecute = '';
        if ('fileName' in file) {
          const temporaryDirectory = await mkdtemp(`${tmpdir()}${path.sep}`);
          filePathToExecute = path.join(temporaryDirectory, file.fileName);
          await writeFile(filePathToExecute, file.fileContent);
        } else if ('filePath' in file) {
          filePathToExecute = file.filePath;
        }
        const execution = fork(zxPath, [filePathToExecute], { silent: true });

        execution.on('close', function (code) {
          observer.next({ type: 'control', actions: ZxWorkerControlActions.ended, message: `child process exited with code ${String(code)}` });
        });
        execution.stdout?.on('data', (stdout: Buffer) => {
          // if there are multiple console.log, their output will be concatenated into this stdout. And some of them are not intended to be executed. We use TW_SCRIPT_SEPARATOR to allow user determine the range they want to execute in the $tw context.
          const message = String(stdout);
          const zxConsoleLogMessages = extractTWContextScripts(message);
          // log and execute each different console.log result.
          zxConsoleLogMessages.forEach(({ messageType, content }) => {
            if (messageType === 'script') {
              observer.next({ type: 'execution', message: content });
              if (wikiInstance === undefined) {
                observer.next({ type: 'stderr', message: `Error in executeZxScript(): $tw is undefined` });
              } else {
                const context = getTWVmContext(wikiInstance);
                const twExecutionResult = executeScriptInTWContext(content, context);
                observer.next({ type: 'stdout', message: twExecutionResult.join('\n\n') });
              }
            } else {
              observer.next({ type: 'stdout', message: content });
            }
          });
        });
        execution.stderr?.on('data', (stdout: Buffer) => {
          observer.next({ type: 'stderr', message: String(stdout) });
        });
        execution.on('error', (error) => {
          observer.next({ type: 'stderr', message: `${error.message} ${error.stack ?? ''}` });
        });
      } catch (error) {
        const message = `zx script's executeZxScriptIIFE() failed with error ${(error as Error).message} ${(error as Error).stack ?? ''}`;
        observer.next({ type: 'control', actions: ZxWorkerControlActions.error, message });
      }
    })();
  });
}

const wikiWorker = { startNodeJSWiki, getTiddlerFileMetadata: (tiddlerTitle: string) => wikiInstance?.boot?.files?.[tiddlerTitle], executeZxScript };
export type WikiWorker = typeof wikiWorker;
expose(wikiWorker);
