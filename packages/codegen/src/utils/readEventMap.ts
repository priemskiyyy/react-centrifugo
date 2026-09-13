import ts from "typescript";
import { CodegenFailure } from "src/errors/CodegenFailure";

const readEventName = (
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  event: ts.Symbol,
) => {
  if (event.flags & ts.SymbolFlags.Optional) {
    throw new CodegenFailure(
      `Event "${event.name}" is optional. Every event key must be required.`,
    );
  }

  const definition = checker.getTypeOfSymbolAtLocation(event, sourceFile);
  const channel = checker.getPropertyOfType(definition, "channel");
  const payload = checker.getPropertyOfType(definition, "payload");

  if (channel === undefined) {
    throw new CodegenFailure(
      `Event "${event.name}" has no "channel" field. Add a required string channel.`,
    );
  }

  if (payload === undefined) {
    throw new CodegenFailure(
      `Event "${event.name}" has no "payload" field. Add a required payload type.`,
    );
  }

  if (channel.flags & ts.SymbolFlags.Optional) {
    throw new CodegenFailure(
      `Event "${event.name}" has an optional "channel". It must be required.`,
    );
  }

  if (payload.flags & ts.SymbolFlags.Optional) {
    throw new CodegenFailure(
      `Event "${event.name}" has an optional "payload". It must be required.`,
    );
  }

  const channelType = checker.getTypeOfSymbolAtLocation(channel, sourceFile);

  if (channelType.flags & (ts.TypeFlags.Any | ts.TypeFlags.Never)) {
    throw new CodegenFailure(
      `Event "${event.name}" needs a string channel, but its "channel" is ${checker.typeToString(channelType)}. Declare a string or template-literal type.`,
    );
  }

  if (!checker.isTypeAssignableTo(channelType, checker.getStringType())) {
    throw new CodegenFailure(
      `Event "${event.name}" needs a string channel, but its "channel" is ${checker.typeToString(channelType)}.`,
    );
  }

  return event.name;
};

const requireObjectEventMap = (
  checker: ts.TypeChecker,
  eventMap: ts.Type,
): void => {
  const isObjectLike =
    eventMap.flags &
    (ts.TypeFlags.Object | ts.TypeFlags.Intersection | ts.TypeFlags.Union);

  if (!isObjectLike) {
    throw new CodegenFailure("The event map must resolve to an object type.");
  }

  if (checker.getIndexInfosOfType(eventMap).length > 0) {
    throw new CodegenFailure(
      "The event map must have finite event keys. An index signature such as [key: string] admits events codegen cannot enumerate.",
    );
  }

  if (eventMap.isUnion()) {
    throw new CodegenFailure(
      "The event map must be one object type. A union has no single set of events; intersect your maps instead.",
    );
  }
};

const requireStringKeys = (keysType: ts.Type): void => {
  const keys = keysType.isUnion() ? keysType.types : [keysType];

  const invalid = keys.some((key) => {
    if (key.isStringLiteral()) {
      return false;
    }

    return !(key.flags & ts.TypeFlags.Never);
  });

  if (invalid) {
    throw new CodegenFailure(
      "The event map must have finite string keys. Numeric and symbol keys are not supported.",
    );
  }
};

export const readEventMap = (program: ts.Program, filename: string) => {
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(filename);

  if (sourceFile === undefined) {
    throw new CodegenFailure(`Cannot read event map: ${filename}`);
  }

  const diagnostics = program.getSemanticDiagnostics(sourceFile);

  if (diagnostics.length > 0) {
    throw new CodegenFailure(
      diagnostics
        .map((diagnostic) =>
          ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        )
        .join("\n"),
    );
  }

  // createEventMapSource writes exactly these two aliases, in this order.
  const [mapDeclaration, keysDeclaration] = sourceFile.statements.filter(
    ts.isTypeAliasDeclaration,
  );

  if (mapDeclaration === undefined || keysDeclaration === undefined) {
    throw new CodegenFailure("The compiler's event-map query is incomplete.");
  }

  const eventMap = checker.getTypeFromTypeNode(mapDeclaration.type);
  requireObjectEventMap(checker, eventMap);
  requireStringKeys(checker.getTypeFromTypeNode(keysDeclaration.type));

  return checker
    .getPropertiesOfType(eventMap)
    .map((event) => readEventName(checker, sourceFile, event))
    .sort();
};
