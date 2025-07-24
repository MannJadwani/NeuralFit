import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // User profiles with fitness stats and goals
  profiles: defineTable({
    userId: v.id("users"),
    height: v.optional(v.number()), // in cm
    weight: v.optional(v.number()), // in kg
    age: v.optional(v.number()),
    fitnessLevel: v.optional(v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced"))),
    goals: v.optional(v.array(v.union(v.literal("weight_loss"), v.literal("muscle_gain"), v.literal("endurance"), v.literal("strength")))),
    targetWeight: v.optional(v.number()),
    activityLevel: v.optional(v.union(v.literal("sedentary"), v.literal("light"), v.literal("moderate"), v.literal("active"), v.literal("very_active"))),
  }).index("by_user", ["userId"]),

  // Exercise library
  exercises: defineTable({
    name: v.string(),
    category: v.string(), // chest, back, legs, etc.
    muscleGroups: v.array(v.string()),
    equipment: v.optional(v.string()),
    instructions: v.array(v.string()),
    difficulty: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
    videoUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  }).index("by_category", ["category"]),

  // Workout templates/plans
  workoutPlans: defineTable({
    name: v.string(),
    description: v.string(),
    createdBy: v.optional(v.id("users")), // null for system-generated plans
    difficulty: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
    duration: v.number(), // estimated minutes
    exercises: v.array(v.object({
      exerciseId: v.id("exercises"),
      sets: v.number(),
      reps: v.optional(v.number()),
      weight: v.optional(v.number()),
      duration: v.optional(v.number()), // for time-based exercises
      restTime: v.optional(v.number()), // seconds
    })),
    tags: v.array(v.string()),
  }).index("by_creator", ["createdBy"]),

  // Workout sessions (logged workouts)
  workoutSessions: defineTable({
    userId: v.id("users"),
    planId: v.optional(v.id("workoutPlans")),
    name: v.string(),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    exercises: v.array(v.object({
      exerciseId: v.id("exercises"),
      sets: v.array(v.object({
        reps: v.optional(v.number()),
        weight: v.optional(v.number()),
        duration: v.optional(v.number()),
        completed: v.boolean(),
      })),
    })),
    notes: v.optional(v.string()),
    totalCaloriesBurned: v.optional(v.number()),
  }).index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "startTime"]),

  // Food database
  foods: defineTable({
    name: v.string(),
    brand: v.optional(v.string()),
    barcode: v.optional(v.string()),
    caloriesPerServing: v.number(),
    servingSize: v.string(),
    macros: v.object({
      protein: v.number(), // grams
      carbs: v.number(),
      fat: v.number(),
      fiber: v.optional(v.number()),
      sugar: v.optional(v.number()),
    }),
    verified: v.boolean(), // system-verified foods
  }).index("by_barcode", ["barcode"])
    .index("by_name", ["name"]),

  // Nutrition logs
  nutritionLogs: defineTable({
    userId: v.id("users"),
    date: v.string(), // YYYY-MM-DD format
    meals: v.array(v.object({
      type: v.union(v.literal("breakfast"), v.literal("lunch"), v.literal("dinner"), v.literal("snack")),
      foods: v.array(v.object({
        foodId: v.id("foods"),
        quantity: v.number(),
        unit: v.string(),
      })),
    })),
    waterIntake: v.number(), // ml
    totalCalories: v.number(),
    totalMacros: v.object({
      protein: v.number(),
      carbs: v.number(),
      fat: v.number(),
    }),
  }).index("by_user_and_date", ["userId", "date"]),

  // Progress photos
  progressPhotos: defineTable({
    userId: v.id("users"),
    imageId: v.id("_storage"),
    date: v.number(),
    weight: v.optional(v.number()),
    notes: v.optional(v.string()),
  }).index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "date"]),

  // Weight tracking
  weightEntries: defineTable({
    userId: v.id("users"),
    weight: v.number(), // kg
    date: v.number(),
    notes: v.optional(v.string()),
  }).index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "date"]),

  // Challenges
  challenges: defineTable({
    name: v.string(),
    description: v.string(),
    createdBy: v.id("users"),
    startDate: v.number(),
    endDate: v.number(),
    isPublic: v.boolean(),
    inviteCode: v.string(), // for sharing
    dailyTasks: v.array(v.object({
      name: v.string(),
      description: v.string(),
      target: v.optional(v.number()), // e.g., 10000 for steps
      unit: v.optional(v.string()), // e.g., "steps", "pushups"
    })),
    participants: v.array(v.id("users")),
    status: v.union(v.literal("pending"), v.literal("active"), v.literal("completed")),
  }).index("by_creator", ["createdBy"])
    .index("by_invite_code", ["inviteCode"])
    .index("by_status", ["status"]),

  // Challenge participation and progress
  challengeProgress: defineTable({
    challengeId: v.id("challenges"),
    userId: v.id("users"),
    date: v.string(), // YYYY-MM-DD
    completedTasks: v.array(v.object({
      taskIndex: v.number(),
      completed: v.boolean(),
      value: v.optional(v.number()), // actual value achieved
    })),
    totalScore: v.number(),
  }).index("by_challenge", ["challengeId"])
    .index("by_challenge_and_user", ["challengeId", "userId"])
    .index("by_challenge_and_date", ["challengeId", "date"]),

  // Challenge invitations
  challengeInvitations: defineTable({
    challengeId: v.id("challenges"),
    invitedBy: v.id("users"),
    invitedUser: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined")),
    sentAt: v.number(),
    respondedAt: v.optional(v.number()),
  }).index("by_invited_user", ["invitedUser"])
    .index("by_challenge", ["challengeId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
