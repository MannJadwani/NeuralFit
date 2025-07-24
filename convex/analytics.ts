import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getWeightProgress = query({
  args: {
    days: v.optional(v.number()), // default 30 days
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const days = args.days || 30;
    const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);

    return await ctx.db
      .query("weightEntries")
      .withIndex("by_user_and_date", (q) => 
        q.eq("userId", userId).gte("date", cutoffDate)
      )
      .order("asc")
      .collect();
  },
});

export const getWorkoutStats = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { totalWorkouts: 0, totalMinutes: 0, consistency: 0 };

    const days = args.days || 30;
    const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);

    const sessions = await ctx.db
      .query("workoutSessions")
      .withIndex("by_user_and_date", (q) => 
        q.eq("userId", userId).gte("startTime", cutoffDate)
      )
      .filter((q) => q.neq(q.field("endTime"), undefined))
      .collect();

    const totalWorkouts = sessions.length;
    const totalMinutes = sessions.reduce((sum, session) => {
      if (session.endTime) {
        return sum + Math.round((session.endTime - session.startTime) / (1000 * 60));
      }
      return sum;
    }, 0);

    // Calculate consistency (workouts per week)
    const weeks = Math.ceil(days / 7);
    const consistency = weeks > 0 ? Math.round((totalWorkouts / weeks) * 10) / 10 : 0;

    return {
      totalWorkouts,
      totalMinutes,
      consistency,
    };
  },
});

export const getNutritionStats = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { avgCalories: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0 };

    const days = args.days || 7;
    const dates = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    const nutritionLogs = [];
    for (const date of dates) {
      const log = await ctx.db
        .query("nutritionLogs")
        .withIndex("by_user_and_date", (q) => q.eq("userId", userId).eq("date", date))
        .first();
      if (log) nutritionLogs.push(log);
    }

    if (nutritionLogs.length === 0) {
      return { avgCalories: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0 };
    }

    const totals = nutritionLogs.reduce(
      (sum, log) => ({
        calories: sum.calories + log.totalCalories,
        protein: sum.protein + log.totalMacros.protein,
        carbs: sum.carbs + log.totalMacros.carbs,
        fat: sum.fat + log.totalMacros.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const count = nutritionLogs.length;
    return {
      avgCalories: Math.round(totals.calories / count),
      avgProtein: Math.round(totals.protein / count),
      avgCarbs: Math.round(totals.carbs / count),
      avgFat: Math.round(totals.fat / count),
    };
  },
});

export const getPersonalRecords = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const sessions = await ctx.db
      .query("workoutSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.neq(q.field("endTime"), undefined))
      .collect();

    const records = new Map();

    for (const session of sessions) {
      for (const exercise of session.exercises) {
        const exerciseData = await ctx.db.get(exercise.exerciseId);
        if (!exerciseData) continue;

        const exerciseName = exerciseData.name;
        
        for (const set of exercise.sets) {
          if (set.completed && set.weight) {
            const currentRecord = records.get(exerciseName);
            if (!currentRecord || set.weight > currentRecord.weight) {
              records.set(exerciseName, {
                exerciseName,
                weight: set.weight,
                reps: set.reps,
                date: session.startTime,
              });
            }
          }
        }
      }
    }

    return Array.from(records.values()).sort((a, b) => b.date - a.date);
  },
});

export const logWeight = mutation({
  args: {
    weight: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("weightEntries", {
      userId,
      weight: args.weight,
      date: Date.now(),
      notes: args.notes,
    });
  },
});
