export function ok(data, status = 200) {
  return Response.json(
    {
      success: true,
      data,
    },
    { status },
  );
}

export function err(message, code = "ERROR", status = 500, details = null) {
  return Response.json(
    {
      success: false,
      error: message,
      code,
      details,
    },
    { status },
  );
}
