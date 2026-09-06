import * as fs from "fs";
import yaml from "js-yaml";
import path from "path";
import os from "os";

console.log("Reforging Symlinks");

function expandHome(p) {
  if (p.startsWith("~")) {
    return path.join(os.homedir(), p.slice(1));
  }
  return p;
}

// Removes whatever is at linkPath (symlink, dangling symlink, or nothing)
// and creates a fresh symlink pointing at target.
async function forceSymlink(target, linkPath) {
  try {
    await fs.promises.unlink(linkPath);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  await fs.promises.symlink(target, linkPath);
  console.log(`  ${linkPath} -> ${target}`);
}

if (fs.existsSync("foundry-config.yaml")) {
  let fileRoot = "";
  try {
    const fc = await fs.promises.readFile("foundry-config.yaml", "utf-8");

    const foundryConfig = yaml.load(fc);
    const installPath = expandHome(foundryConfig.installPath);

    // As of 13.338, the Node install is *not* nested but electron installs *are*
    const nested = fs.existsSync(path.join(installPath, "resources", "app"));

    if (nested) {
      fileRoot = path.join(installPath, "resources", "app");
    } else {
      fileRoot = installPath;
    }
  } catch (err) {
    console.error(`Error reading foundry-config.yaml: ${err}`);
  }

  try {
    await fs.promises.mkdir("foundry");
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
  }

  // Javascript files
  for (const p of ["client", "common", "tsconfig.json"]) {
    try {
      await forceSymlink(path.join(fileRoot, p), path.join("foundry", p));
    } catch (e) {
      console.error(`Error linking ${p}: ${e}`);
      throw e;
    }
  }

  // Language files
  try {
    await forceSymlink(path.join(fileRoot, "public", "lang"), path.join("foundry", "lang"));
  } catch (e) {
    console.error(`Error linking lang: ${e}`);
    throw e;
  }
} else {
  console.log("Foundry config file did not exist.");
}
