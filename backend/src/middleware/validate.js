export const validate = (schema) => (req, res, next) => {
  const parsed = schema.parse({
    body: req.body,
    query: req.query,
    params: req.params
  });

  req.body = parsed.body;
  req.query = parsed.query;
  req.params = parsed.params;
  next();
};
