import { query, mutation, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";

export const generateWorkoutPlan = action({
  args: {
    fitnessLevel: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
    goals: v.array(v.union(v.literal("weight_loss"), v.literal("muscle_gain"), v.literal("endurance"), v.literal("strength"))),
    duration: v.number(), // minutes
    equipment: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    const exercises = await ctx.runQuery(api.exercises.listExercises, {
      difficulty: args.fitnessLevel,
    });

    if (exercises.length === 0) {
      throw new Error("No exercises found for the specified criteria");
    }

    // Use AI to generate a personalized workout plan
    const prompt = `Create a ${args.duration}-minute workout plan for a ${args.fitnessLevel} level person with goals: ${args.goals.join(", ")}. 
    
Available exercises: ${exercises.map((e: any) => `${e.name} (${e.category}, ${e.muscleGroups.join(", ")})`).join(", ")}

Please respond with a JSON object containing:
- name: workout plan name
- description: brief description
- exercises: array of objects with exerciseId (use the exercise name to match), sets, reps (if applicable), duration (if time-based), restTime

Focus on balanced muscle groups and appropriate intensity for the fitness level.`;

    try {
      const response = await fetch(`${process.env.CONVEX_OPENAI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.CONVEX_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-nano",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Parse the AI response
      const workoutPlan = JSON.parse(content);
      
      // Map exercise names to IDs
      const exercisesWithIds = workoutPlan.exercises.map((exercise: any) => {
        const foundExercise = exercises.find((e: any) => 
          e.name.toLowerCase() === exercise.exerciseId.toLowerCase()
        );
        return {
          ...exercise,
          exerciseId: foundExercise?._id || exercises[0]._id, // fallback to first exercise
        };
      });

      return await ctx.runMutation(internal.workouts.createWorkoutPlan, {
        name: workoutPlan.name,
        description: workoutPlan.description,
        difficulty: args.fitnessLevel,
        duration: args.duration,
        exercises: exercisesWithIds,
        tags: args.goals,
      });
    } catch (error) {
      console.error("Error generating workout plan:", error);
      
      // Fallback: create a simple workout plan
      const fallbackExercises = exercises.slice(0, 4).map((exercise: any) => ({
        exerciseId: exercise._id,
        sets: 3,
        reps: exercise.category === "core" ? undefined : 12,
        duration: exercise.category === "core" ? 30 : undefined,
        restTime: 60,
      }));

      return await ctx.runMutation(internal.workouts.createWorkoutPlan, {
        name: `${args.fitnessLevel.charAt(0).toUpperCase() + args.fitnessLevel.slice(1)} Workout`,
        description: `A balanced workout for ${args.goals.join(" and ")}`,
        difficulty: args.fitnessLevel,
        duration: args.duration,
        exercises: fallbackExercises,
        tags: args.goals,
      });
    }
  },
});

export const createWorkoutPlan = internalMutation({
  args: {
    name: v.string(),
    description: v.string(),
    difficulty: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
    duration: v.number(),
    exercises: v.array(v.object({
      exerciseId: v.id("exercises"),
      sets: v.number(),
      reps: v.optional(v.number()),
      weight: v.optional(v.number()),
      duration: v.optional(v.number()),
      restTime: v.optional(v.number()),
    })),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    
    return await ctx.db.insert("workoutPlans", {
      ...args,
      createdBy: userId || undefined,
    });
  },
});

export const getWorkoutPlans = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    
    return await ctx.db
      .query("workoutPlans")
      .filter((q) => q.or(q.eq(q.field("createdBy"), null), q.eq(q.field("createdBy"), userId)))
      .collect();
  },
});

export const startWorkoutSession = mutation({
  args: {
    planId: v.optional(v.id("workoutPlans")),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let exercises: any[] = [];
    
    if (args.planId) {
      const plan = await ctx.db.get(args.planId);
      if (plan) {
        exercises = plan.exercises.map((exercise: any) => ({
          exerciseId: exercise.exerciseId,
          sets: Array(exercise.sets).fill({
            reps: exercise.reps,
            weight: exercise.weight,
            duration: exercise.duration,
            completed: false,
          }),
        }));
      }
    }

    return await ctx.db.insert("workoutSessions", {
      userId,
      planId: args.planId,
      name: args.name,
      startTime: Date.now(),
      exercises,
    });
  },
});

export const updateWorkoutSession = mutation({
  args: {
    sessionId: v.id("workoutSessions"),
    exercises: v.optional(v.array(v.object({
      exerciseId: v.id("exercises"),
      sets: v.array(v.object({
        reps: v.optional(v.number()),
        weight: v.optional(v.number()),
        duration: v.optional(v.number()),
        completed: v.boolean(),
      })),
    }))),
    endTime: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found or unauthorized");
    }

    const updates: any = {};
    if (args.exercises) updates.exercises = args.exercises;
    if (args.endTime) updates.endTime = args.endTime;
    if (args.notes) updates.notes = args.notes;

    await ctx.db.patch(args.sessionId, updates);
    return args.sessionId;
  },
});

export const getWorkoutSessions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("workoutSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit || 10);
  },
});

export const getActiveWorkoutSession = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("workoutSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("endTime"), undefined))
      .first();
  },
});
