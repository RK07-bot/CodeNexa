const validate = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,

        // Converts Zod validation errors into an object grouped by field name
        // Example:
        // {
        //   username: ["Username must be at least 3 characters"],
        //   password: ["Password must be at least 8 characters"]
        // }
        errors: result.error.flatten().fieldErrors,
        
        message: "Validation Error",
      });
    }

    req.body = result.data; // validated data
    next();
  };
};

export default validate;
