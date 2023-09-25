import fs from 'fs';
import path from 'path';
import { HttpStatusCode } from 'axios';

import Logger from '@Logger';
import AppError from '@errors/AppError';

export default class SecretsManager {
  private static SECRETS_DIR = process.env.SECRETS_DIR || '/run/secrets';
  private static SECRETS_EXT = process.env.SECRETS_EXT || '.secret';

  private static instance: SecretsManager;
  private secrets: Map<string, string> = new Map();

  private constructor() {
    this.secrets = SecretsManager.loadSecrets();
  }

  private static loadSecrets = (): Map<string, string> => {
    const secrets: Map<string, string> = new Map();

    fs.readdirSync(SecretsManager.SECRETS_DIR)
      .filter((filename) => filename.endsWith(SecretsManager.SECRETS_EXT))
      .forEach((filename) => {
        const secretName = path.basename(filename, SecretsManager.SECRETS_EXT);
        const secretPath = path.join(SecretsManager.SECRETS_DIR, filename);

        try {
          Logger.info(`Reading secret '${secretName}'.`);
          secrets.set(secretName, fs.readFileSync(secretPath, 'utf8'));
        } catch (err) {
          throw AppError.createAppError(err, `Could not read secret '${secretName}'.`, HttpStatusCode.ExpectationFailed);
        }
      });

    return secrets;
  };

  public static getInstance = () => {
    if (!this.instance) this.instance = new SecretsManager();
    return this.instance;
  };

  public getSecret = (secretName: string): string => {
    const secret = this.secrets.get(secretName);
    if (!secret) throw AppError.createAppError(new Error(`Secret '${secretName}' not found.`), null, HttpStatusCode.NotFound);

    return secret;
  };
}
