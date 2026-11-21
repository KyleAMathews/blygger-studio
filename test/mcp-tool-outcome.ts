type ToolFailure = {
  name: string;
  message: string;
  cause?: ToolFailure;
  errors?: ToolFailure[];
};

// SDK errors carry runtime symbols and request objects. Record the stable error
// diagnostics promised at this call boundary, including nested failure causes.
function toolFailure(error: unknown, ancestors = new Set<unknown>()): ToolFailure {
  if (ancestors.has(error)) return { name: 'CircularCause', message: 'Repeated error in cause chain' };
  const nested = new Set(ancestors).add(error);
  if (!(error instanceof Error)) return { name: typeof error, message: String(error) };
  return {
    name: error.name,
    message: error.message,
    ...(error.cause === undefined ? {} : { cause: toolFailure(error.cause, nested) }),
    ...(error instanceof AggregateError ? { errors: Array.from(error.errors, value => toolFailure(value, nested)) } : {}),
  };
}

export async function toolOutcome(operation: () => Promise<unknown>) {
  try { await operation(); return 'returned'; }
  catch (error) { return { threw: toolFailure(error) }; }
}
