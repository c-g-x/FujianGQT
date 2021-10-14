import * as fs from 'fs/promises';

const CONFIG_FILE_NAME = '../config_fjgqt/config.json';

let file = await fs.readFile(CONFIG_FILE_NAME, 'utf-8');
let json = JSON.parse(file);

export async function getOcrConfig() {
  return json['baidu-ocr'];
}

export async function getSecretaries() {
  return json['secretaries'];
}

export async function getMembers() {
  return json['members'];
}

export async function getEmailConfigurations() {
  return json['email'];
}
