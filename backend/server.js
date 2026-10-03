import config from "./src/config/env.js";
import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import { connectRedis } from "./src/config/redis.js";
import "./src/jobs/workers/email.worker.js"



await connectDB();
await connectRedis();

const port = config.PORT || 3000;


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
