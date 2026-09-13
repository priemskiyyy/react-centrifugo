import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { GENERATED_HEADER } from "src/utils/renderHooks";
import { CodegenFailure } from "src/errors/CodegenFailure";

const MANIFEST_FILENAME = ".react-centrifugo-codegen.json";

const parseManifest = (filename: string): unknown => {
  try {
    return JSON.parse(readFileSync(filename, "utf8"));
  } catch {
    throw new CodegenFailure(
      `Codegen manifest is not valid JSON: ${filename}. Delete it and regenerate.`,
    );
  }
};

/**
 * Manifest entries name files codegen may delete, so each is re-validated as a
 * bare generated filename; a tampered manifest cannot reach outside `directory`.
 */
const readPreviousFilenames = (directory: string): string[] => {
  const filename = path.join(directory, MANIFEST_FILENAME);

  if (!existsSync(filename)) {
    return [];
  }

  const manifest = parseManifest(filename);

  if (!Array.isArray(manifest)) {
    throw new CodegenFailure(
      `Codegen manifest must be an array of filenames: ${filename}`,
    );
  }

  return manifest.map((entry: unknown) => {
    if (typeof entry !== "string") {
      throw new CodegenFailure(
        `Codegen manifest contains a non-string entry: ${filename}`,
      );
    }

    if (!/^[a-zA-Z0-9]+\.ts$/.test(entry)) {
      throw new CodegenFailure(
        `Codegen manifest contains an unexpected filename ${JSON.stringify(entry)}: ${filename}`,
      );
    }

    return entry;
  });
};

export const writeGeneratedFiles = (
  directory: string,
  files: Map<string, string>,
  check: boolean,
): string[] => {
  const previous = readPreviousFilenames(directory);
  const stale = previous.filter((filename) => !files.has(filename));
  const changed: string[] = [];

  [...new Set([...files.keys(), ...stale])].forEach((filename) => {
    const target = path.join(directory, filename);
    const content = files.get(filename);

    if (!existsSync(target)) {
      if (content !== undefined) {
        changed.push(filename);
      }

      return;
    }

    const current = readFileSync(target, "utf8");

    if (!current.startsWith(GENERATED_HEADER)) {
      throw new CodegenFailure(
        `Refusing to modify a file without the codegen header: ${target}`,
      );
    }

    if (current !== content) {
      changed.push(filename);
    }
  });

  const manifest = `${JSON.stringify([...files.keys()].sort(), null, 2)}\n`;
  const manifestPath = path.join(directory, MANIFEST_FILENAME);
  if (!existsSync(manifestPath)) {
    changed.push(MANIFEST_FILENAME);
  } else if (readFileSync(manifestPath, "utf8") !== manifest) {
    changed.push(MANIFEST_FILENAME);
  }

  if (check) {
    return changed;
  }

  if (changed.length === 0) {
    return changed;
  }

  try {
    mkdirSync(directory, { recursive: true });
    changed.forEach((filename) => {
      if (filename === MANIFEST_FILENAME) {
        writeFileSync(manifestPath, manifest);
        return;
      }

      const target = path.join(directory, filename);
      const content = files.get(filename);

      if (content === undefined) {
        unlinkSync(target);
        return;
      }

      writeFileSync(target, content);
    });
  } catch (cause) {
    throw new CodegenFailure(
      `Cannot write generated hooks to ${directory}: ${String(cause)}`,
    );
  }

  return changed;
};
