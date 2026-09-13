/**
 * A problem with the project being generated from: bad configuration, an event
 * map that cannot be read, or generated files that cannot be written. Anything
 * else thrown during generation is a bug in codegen, not a CodegenFailure.
 */
export class CodegenFailure extends Error {
  override name = "CodegenFailure";
}
