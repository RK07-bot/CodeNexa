import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import config from "../src/config/env.js";
import userModel from "../src/models/user.model.js";
import problemModel from "../src/models/problem.model.js";
import { slugify } from "../src/utils/slugify.js";

const adminEmail = process.argv[2];

if (!adminEmail) {
  console.log("Usage: node scripts/seedProblems.js admin@example.com");
  process.exit(1);
}

const problemsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "problems",
);

await mongoose.connect(config.MONGO_URI);

const admin = await userModel.findOne({ email: adminEmail, role: "admin" });

if (!admin) {
  console.log("No admin found with that email. Run seedAdmin.js first.");
  await mongoose.disconnect();
  process.exit(1);
}

const files = fs.readdirSync(problemsDir).filter((f) => f.endsWith(".json"));
let created = 0;
let updated = 0;

for (const file of files) {
  try {
    const data = JSON.parse(
      fs.readFileSync(path.join(problemsDir, file), "utf8"),
    );
    const slug = slugify(data.title);

    const fields = {
      ...data,
      slug,
      testCases: data.testCases.map((t) => ({ ...t, source: "author" })),
      status: "approved",
      createdBy: admin._id,
      reviewedBy: admin._id,
      reviewedAt: new Date(),
    };

    // the + is needed because these two fields are hidden by default in the model
    const existing = await problemModel
      .findOne({ slug })
      .select("+testCases +referenceSolution");

    // running the script again updates a problem instead of duplicating it
    if (existing) {
      existing.set(fields);
      await existing.save();
      updated++;
    } else {
      await problemModel.create(fields);
      created++;
    }

    console.log(`${slug}: ok`);
  } catch (err) {
    console.log(`${file}: failed - ${err.message}`);
  }
}

console.log(`Done. Created ${created}, updated ${updated}.`);
await mongoose.disconnect();