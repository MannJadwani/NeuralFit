import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const searchFoods = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.query.length < 2) return [];

    return await ctx.db
      .query("foods")
      .withIndex("by_name")
      .filter((q) => q.gte(q.field("name"), args.query))
      .filter((q) => q.lt(q.field("name"), args.query + "\uffff"))
      .take(20);
  },
});

export const getFoodByBarcode = query({
  args: {
    barcode: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("foods")
      .withIndex("by_barcode", (q) => q.eq("barcode", args.barcode))
      .first();
  },
});

export const addFood = mutation({
  args: {
    name: v.string(),
    brand: v.optional(v.string()),
    barcode: v.optional(v.string()),
    caloriesPerServing: v.number(),
    servingSize: v.string(),
    macros: v.object({
      protein: v.number(),
      carbs: v.number(),
      fat: v.number(),
      fiber: v.optional(v.number()),
      sugar: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("foods", {
      ...args,
      verified: false,
    });
  },
});

export const getTodaysNutrition = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const today = new Date().toISOString().split('T')[0];
    
    return await ctx.db
      .query("nutritionLogs")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId).eq("date", today))
      .first();
  },
});

export const logNutrition = mutation({
  args: {
    date: v.string(),
    mealType: v.union(v.literal("breakfast"), v.literal("lunch"), v.literal("dinner"), v.literal("snack")),
    foods: v.array(v.object({
      foodId: v.id("foods"),
      quantity: v.number(),
      unit: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existingLog = await ctx.db
      .query("nutritionLogs")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId).eq("date", args.date))
      .first();

    // Calculate nutrition totals
    let totalCalories = 0;
    let totalMacros = { protein: 0, carbs: 0, fat: 0 };

    for (const foodEntry of args.foods) {
      const food = await ctx.db.get(foodEntry.foodId);
      if (food) {
        const multiplier = foodEntry.quantity;
        totalCalories += food.caloriesPerServing * multiplier;
        totalMacros.protein += food.macros.protein * multiplier;
        totalMacros.carbs += food.macros.carbs * multiplier;
        totalMacros.fat += food.macros.fat * multiplier;
      }
    }

    const newMeal = {
      type: args.mealType,
      foods: args.foods,
    };

    if (existingLog) {
      const updatedMeals = [...existingLog.meals];
      const existingMealIndex = updatedMeals.findIndex(meal => meal.type === args.mealType);
      
      if (existingMealIndex >= 0) {
        updatedMeals[existingMealIndex] = {
          ...updatedMeals[existingMealIndex],
          foods: [...updatedMeals[existingMealIndex].foods, ...args.foods],
        };
      } else {
        updatedMeals.push(newMeal);
      }

      await ctx.db.patch(existingLog._id, {
        meals: updatedMeals,
        totalCalories: existingLog.totalCalories + totalCalories,
        totalMacros: {
          protein: existingLog.totalMacros.protein + totalMacros.protein,
          carbs: existingLog.totalMacros.carbs + totalMacros.carbs,
          fat: existingLog.totalMacros.fat + totalMacros.fat,
        },
      });

      return existingLog._id;
    } else {
      return await ctx.db.insert("nutritionLogs", {
        userId,
        date: args.date,
        meals: [newMeal],
        waterIntake: 0,
        totalCalories,
        totalMacros,
      });
    }
  },
});

export const updateWaterIntake = mutation({
  args: {
    date: v.string(),
    amount: v.number(), // ml
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existingLog = await ctx.db
      .query("nutritionLogs")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId).eq("date", args.date))
      .first();

    if (existingLog) {
      await ctx.db.patch(existingLog._id, {
        waterIntake: existingLog.waterIntake + args.amount,
      });
      return existingLog._id;
    } else {
      return await ctx.db.insert("nutritionLogs", {
        userId,
        date: args.date,
        meals: [],
        waterIntake: args.amount,
        totalCalories: 0,
        totalMacros: { protein: 0, carbs: 0, fat: 0 },
      });
    }
  },
});

// Seed some basic foods
export const seedFoods = mutation({
  args: {},
  handler: async (ctx) => {
    const foods = [
      {
        name: "Chicken Breast",
        caloriesPerServing: 165,
        servingSize: "100g",
        macros: { protein: 31, carbs: 0, fat: 3.6 },
        verified: true,
      },
      {
        name: "Brown Rice",
        caloriesPerServing: 111,
        servingSize: "100g cooked",
        macros: { protein: 2.6, carbs: 23, fat: 0.9 },
        verified: true,
      },
      {
        name: "Broccoli",
        caloriesPerServing: 34,
        servingSize: "100g",
        macros: { protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6 },
        verified: true,
      },
      {
        name: "Banana",
        caloriesPerServing: 89,
        servingSize: "1 medium (118g)",
        macros: { protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, sugar: 12 },
        verified: true,
      },
      {
        name: "Oats",
        caloriesPerServing: 389,
        servingSize: "100g dry",
        macros: { protein: 16.9, carbs: 66, fat: 6.9, fiber: 10.6 },
        verified: true,
      },
    ];

    for (const food of foods) {
      await ctx.db.insert("foods", food);
    }

    return "Foods seeded successfully";
  },
});
