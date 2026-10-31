import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    problem: { type: mongoose.Schema.Types.ObjectId, ref: "Problem", required: true },
    language: { type: String, required: true },
    code: { type: String, required: true },
    verdict: {
      type: String,
      enum: ["accepted", "wrong_answer", "runtime_error", "time_limit_exceeded", "compile_error"],
      required: true,
    },
    passed: { type: Number, required: true },
    total: { type: Number, required: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: "Session", default: null },
  },
  { timestamps: true },
);

// the Submissions tab and the solved/attempted status both query by user + problem
submissionSchema.index({ user: 1, problem: 1, createdAt: -1 });
submissionSchema.index({ createdAt: -1 });
submissionSchema.index({ user: 1, createdAt: -1 });

const submissionModel = mongoose.model("Submission", submissionSchema);

export default submissionModel;