import * as Helpers from '../Helpers';
import * as path from 'path';
import * as vscode from 'vscode';

import { OpenOCDConfigurationInterface } from '../types';
import { openOCDInterfaces } from './openOCDInterfaceFiles';

/**
 * Creates an openocd configuration file string. 
 * @param config openocd configuration
 */
export function create(config: OpenOCDConfigurationInterface): string {
  const openocdConfig = `#OpenOCD configuration file, generated by STM32 for VSCode

# Programmer, can be changed to several interfaces
# Standard will be the stlink interface as this is the standard for STM32 dev boards
source [find interface/${config.interface}.cfg]

# The target MCU. This should match your board
source [find target/${config.openocdTarget}.cfg]
`;
  return openocdConfig;
}


/**
 * Write the openocd configuration to the workspace
 * @param configuration openocd configuration file 
 */
export async function write(configuration: string): Promise<void> {
  const workspaceUri = Helpers.getWorkspaceUri();
  if (!workspaceUri) { return Promise.resolve(); }
  return Helpers.writeFileInWorkspace(workspaceUri, 'openocd.cfg', configuration);
}

export async function read(): Promise<string> {
  const workspaceUri = Helpers.getWorkspaceUri();
  if (!workspaceUri) { return Promise.reject(new Error('No open workspace')); }
  const configPath = path.resolve(workspaceUri.fsPath, 'openocd.cfg');
  try {
    const file = await vscode.workspace.fs.readFile(vscode.Uri.file(configPath));
    const configFile = Buffer.from(file).toString('utf-8');
    return Promise.resolve(configFile);
  } catch (error) {
    return Promise.reject(error);
  }
}

export async function readOrCreateConfigFile(config: OpenOCDConfigurationInterface): Promise<void> {
  const workspaceFolder = Helpers.getWorkspaceUri();
  if (!workspaceFolder) { return; }
  try {
    await read();
    return;
    // eslint-disable-next-line no-empty
  } catch (err) { }
  const configuration = create(config);
  try {
    await write(configuration);
  } catch (error) {
    vscode.window.showErrorMessage(
      `Something went wrong while creating the openocd configuration file. Error: ${error}`
    );
    throw error;
  }
}

/**
 * Function for reading the current file and only changing the programmer in that configuration file.
 * @param programmer the string for the openocd programmer.
 */
export function changeProgrammer(programmer: string): Promise<void> {
  const regexPattern = /(?<=source\s*\[find\s+interface\/)[\w-_]+\.cfg/g;
  return new Promise((resolve, reject) => {
    read().then((configuration) => {
      const newConfig = configuration.replace(regexPattern, `${programmer}.cfg`);
      write(newConfig).then(() => {
        resolve();
      }).catch((error) => {
        vscode.window.showErrorMessage(
          `Something went wrong when writing the new openocd configuration file. Error: ${error}`
        );
        reject(error);
      });
    }).catch((error) => {
      vscode.window.showErrorMessage(
        `Something went wrong wen reading the openocd config file for changing the programmer. Error: ${error}`
      );
      reject(error);
    });
  });

}

/**
 * Opens a dialogue to change the programmer in the openocd.cfg file. 
 * @param programmer (optional) if given the programmer will be selected without a dialogue
 */
export function changeProgrammerDialogue(programmer?: string): Promise<void> {
  return new Promise((resolve) => {
    if (programmer) {
      changeProgrammer(programmer).then(() => {
        vscode.window.showInformationMessage(`Successfully set programmer to: ${programmer}`);
        resolve();
      });
    } else {
      vscode.window.showQuickPick(openOCDInterfaces, { placeHolder: 'Please select a programmer' }).then((value) => {
        if (!value) {
          resolve();
          return;
        }
        changeProgrammer(value).then(() => {
          vscode.window.showInformationMessage(`Successfully set programmer to: ${value}`);
          resolve();
        });
      });
    }
  });

}
