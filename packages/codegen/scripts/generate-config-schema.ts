import { writeFileSync } from "node:fs";
import { JSONSchema } from "effect";
import { format } from "prettier";
import { CodegenConfigurationSchema } from "../src/schemas/CodegenConfigurationSchema.ts";

const schema = JSONSchema.make(CodegenConfigurationSchema);
const content = await format(JSON.stringify(schema), { parser: "json" });

writeFileSync(new URL("../config.schema.json", import.meta.url), content);
