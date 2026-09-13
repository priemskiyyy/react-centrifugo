import { Data } from "effect";

/** A CodegenFailure once it has entered Effect, carrying the original as its cause. */
export class CodegenError extends Data.TaggedError("CodegenError")<{
  message: string;
  cause?: unknown;
}> {}
