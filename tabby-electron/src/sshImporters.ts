import at from "core-js-pure/actual/array/at";
import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as path from "path";
import slugify from "slugify";
import * as yaml from "js-yaml";
import glob from "glob";
import { Injectable } from "@angular/core";
import { PartialProfile } from "tabby-core";
import {
  SSHProfileImporter,
  PortForwardType,
  SSHProfile,
  SSHProfileOptions,
  AutoPrivateKeyLocator,
} from "tabby-ssh";

import { ElectronService } from "./services/electron.service";

@Injectable({ providedIn: "root" })
export class OpenSSHImporter extends SSHProfileImporter {
  private sshProfiles: PartialProfile<SSHProfile>[] = [];
  private deriveID = (name) => "openssh-config:" + slugify(name);

  async getProfiles(): Promise<PartialProfile<SSHProfile>[]> {
    this.sshProfiles = [];

    const entryConfigPath = path.join(
      process.env.HOME ?? "~",
      ".ssh",
      "config"
    );
    this.getProfilesFromConfigPath(entryConfigPath);

    return this.sshProfiles;
  }

  private async getProfilesFromConfigPath(
    configPath: string
  ): Promise<PartialProfile<SSHProfile>[]> {
    try {
      const lines = (await fs.readFile(configPath, "utf8")).split("\n");
      const globalOptions: Partial<SSHProfileOptions> = {};
      let currentProfile: PartialProfile<SSHProfile> | null = null;

      for (let line of lines) {
        if (line.toLowerCase().startsWith("include ")) {
          const includedConfigPath = line.substring(8).trim();
          glob(
            includedConfigPath,
            { cwd: path.dirname(configPath) },
            (err, files) => {
              files.forEach(async (file) => {
                await this.getProfilesFromConfigPath(file);
              });
            }
          );
        } else if (line.toLowerCase().startsWith("host ")) {
          if (currentProfile) {
            this.sshProfiles.push(currentProfile);
          }
          const name = line.substring(5).trim();
          currentProfile = {
            id: this.deriveID(name),
            name: `${name} (.ssh/config)`,
            type: "ssh",
            group: "Imported from .ssh/config",
            options: {
              ...globalOptions,
              host: name,
            },
          };
        } else {
          const target: Partial<SSHProfileOptions> =
            currentProfile?.options ?? globalOptions;
          line = line.trim();
          const idx = /\s/.exec(line)?.index ?? -1;
          if (idx === -1) {
            continue;
          }
          const key = line.substring(0, idx).trim();
          const value = line.substring(idx + 1).trim();

          if (key === "IdentityFile") {
            target.privateKeys = value
              .split(",")
              .map((s) => s.trim())
              .map((s) => {
                if (s.startsWith("~")) {
                  s = path.join(process.env.HOME ?? "~", s.slice(2));
                }
                return s;
              });
          } else if (key === "RemoteForward") {
            const bind = value.split(/\s/)[0].trim();
            const tgt = value.split(/\s/)[1].trim();
            target.forwardedPorts ??= [];
            target.forwardedPorts.push({
              type: PortForwardType.Remote,
              description: value,
              host: bind.split(":")[0] ?? "127.0.0.1",
              port: parseInt(bind.split(":")[1] ?? bind),
              targetAddress: tgt.split(":")[0],
              targetPort: parseInt(tgt.split(":")[1]),
            });
          } else if (key === "LocalForward") {
            const bind = value.split(/\s/)[0].trim();
            const tgt = value.split(/\s/)[1].trim();
            target.forwardedPorts ??= [];
            target.forwardedPorts.push({
              type: PortForwardType.Local,
              description: value,
              host: bind.includes(":") ? bind.split(":")[0] : "127.0.0.1",
              port: parseInt(at(bind.split(":"), -1)),
              targetAddress: tgt.split(":")[0],
              targetPort: parseInt(tgt.split(":")[1]),
            });
          } else if (key === "DynamicForward") {
            const bind = value.trim();
            target.forwardedPorts ??= [];
            target.forwardedPorts.push({
              type: PortForwardType.Dynamic,
              description: value,
              host: bind.includes(":") ? bind.split(":")[0] : "127.0.0.1",
              port: parseInt(at(bind.split(":"), -1)),
              targetAddress: "",
              targetPort: 22,
            });
          } else {
            const mappedKey = {
              hostname: "host",
              host: "host",
              port: "port",
              user: "user",
              forwardx11: "x11",
              serveraliveinterval: "keepaliveInterval",
              serveralivecountmax: "keepaliveCountMax",
              proxycommand: "proxyCommand",
              proxyjump: "jumpHost",
            }[key.toLowerCase()];
            if (mappedKey) {
              target[mappedKey] = value;
            }
          }
        }
      }
      if (currentProfile) {
        this.sshProfiles.push(currentProfile);
      }
      for (const p of this.sshProfiles) {
        if (p.options?.proxyCommand) {
          p.options.proxyCommand = p.options.proxyCommand
            .replace("%h", p.options.host ?? "")
            .replace("%p", (p.options.port ?? 22).toString());
        }
        if (p.options?.jumpHost) {
          p.options.jumpHost = this.deriveID(p.options.jumpHost);
        }
      }
      return this.sshProfiles;
    } catch (e) {
      throw e;
    }
  }
}

@Injectable({ providedIn: "root" })
export class StaticFileImporter extends SSHProfileImporter {
  private configPath: string;

  constructor(electron: ElectronService) {
    super();
    this.configPath = path.join(
      electron.app.getPath("userData"),
      "ssh-profiles.yaml"
    );
  }

  async getProfiles(): Promise<PartialProfile<SSHProfile>[]> {
    const deriveID = (name) => "file-config:" + slugify(name);

    if (!fsSync.existsSync(this.configPath)) {
      return [];
    }

    const content = await fs.readFile(this.configPath, "utf8");
    if (!content) {
      return [];
    }

    return (yaml.load(content) as PartialProfile<SSHProfile>[]).map((item) => ({
      ...item,
      id: deriveID(item.name),
      type: "ssh",
    }));
  }
}

@Injectable({ providedIn: "root" })
export class PrivateKeyLocator extends AutoPrivateKeyLocator {
  async getKeys(): Promise<[string, Buffer][]> {
    const results: [string, Buffer][] = [];
    const keysPath = path.join(process.env.HOME!, ".ssh");
    if (!fsSync.existsSync(keysPath)) {
      return results;
    }
    for (const file of await fs.readdir(keysPath)) {
      if (/^id_[\w\d]+$/.test(file)) {
        const privateKeyContents = await fs.readFile(
          path.join(keysPath, file),
          { encoding: null }
        );
        results.push([file, privateKeyContents]);
      }
    }
    return results;
  }
}
