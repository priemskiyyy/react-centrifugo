import { Schema } from "effect";

const exportedIdentifier = Schema.String.pipe(
  Schema.pattern(/^[A-Za-z_$][A-Za-z0-9_$]*$/),
);

export const CodegenConfigurationSchema = Schema.Struct({
  $schema: Schema.optionalWith(Schema.String, { exact: true }),
  events: Schema.Struct({
    file: Schema.NonEmptyString,
    type: exportedIdentifier,
  }).pipe(Schema.mutable),
  dispatcher: Schema.Struct({
    file: Schema.NonEmptyString,
    export: exportedIdentifier,
  }).pipe(Schema.mutable),
  output: Schema.NonEmptyString,
  tsconfig: Schema.optionalWith(Schema.NonEmptyString, { exact: true }),
  hookNames: Schema.optionalWith(
    Schema.Record({
      key: Schema.String,
      value: Schema.String.pipe(Schema.pattern(/^use[A-Z][a-zA-Z0-9]*$/)),
    }).pipe(Schema.mutable),
    { exact: true },
  ),
}).pipe(Schema.mutable);
