import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listExercises = query({
  args: {
    category: v.optional(v.string()),
    difficulty: v.optional(v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced"))),
  },
  handler: async (ctx, args) => {
    let exercises;

    if (args.category) {
      exercises = await ctx.db
        .query("exercises")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
    } else {
      exercises = await ctx.db.query("exercises").collect();
    }

    if (args.difficulty) {
      return exercises.filter(exercise => exercise.difficulty === args.difficulty);
    }

    return exercises;
  },
});

export const getExercise = query({
  args: { id: v.id("exercises") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Seed some basic exercises
export const seedExercises = mutation({
  args: {},
  handler: async (ctx) => {
    const exercises = [
      {
        name: "Push-ups",
        category: "chest",
        muscleGroups: ["chest", "triceps", "shoulders"],
        equipment: "bodyweight",
        instructions: [
          "Start in a plank position with hands slightly wider than shoulders",
          "Lower your body until chest nearly touches the floor",
          "Push back up to starting position",
          "Keep your core tight throughout the movement"
        ],
        difficulty: "beginner" as const,
      },
      {
        name: "Squats",
        category: "legs",
        muscleGroups: ["quadriceps", "glutes", "hamstrings"],
        equipment: "bodyweight",
        instructions: [
          "Stand with feet shoulder-width apart",
          "Lower your body as if sitting back into a chair",
          "Keep your chest up and knees behind toes",
          "Return to starting position"
        ],
        difficulty: "beginner" as const,
      },
      {
        name: "Deadlifts",
        category: "back",
        muscleGroups: ["hamstrings", "glutes", "lower back", "traps"],
        equipment: "barbell",
        instructions: [
          "Stand with feet hip-width apart, bar over mid-foot",
          "Bend at hips and knees to grip the bar",
          "Keep chest up and back straight",
          "Drive through heels to lift the bar"
        ],
        difficulty: "intermediate" as const,
      },
      {
        name: "Plank",
        category: "core",
        muscleGroups: ["core", "shoulders"],
        equipment: "bodyweight",
        instructions: [
          "Start in a push-up position",
          "Lower to forearms, keeping body straight",
          "Hold position, engaging core muscles",
          "Breathe normally throughout"
        ],
        difficulty: "beginner" as const,
      },
    ];

    for (const exercise of exercises) {
      await ctx.db.insert("exercises", exercise);
    }

    return "Exercises seeded successfully";
  },
});
