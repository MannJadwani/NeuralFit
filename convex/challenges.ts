import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createChallenge = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    isPublic: v.boolean(),
    dailyTasks: v.array(v.object({
      name: v.string(),
      description: v.string(),
      target: v.optional(v.number()),
      unit: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Generate a unique invite code
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const challengeId = await ctx.db.insert("challenges", {
      ...args,
      createdBy: userId,
      inviteCode,
      participants: [userId],
      status: "pending",
    });

    // Initialize progress for the creator
    await ctx.db.insert("challengeProgress", {
      challengeId,
      userId,
      date: new Date().toISOString().split('T')[0],
      completedTasks: args.dailyTasks.map((_, index) => ({
        taskIndex: index,
        completed: false,
      })),
      totalScore: 0,
    });

    return { challengeId, inviteCode };
  },
});

export const joinChallengeByCode = mutation({
  args: {
    inviteCode: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const challenge = await ctx.db
      .query("challenges")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", args.inviteCode))
      .first();

    if (!challenge) {
      throw new Error("Challenge not found");
    }

    if (challenge.participants.includes(userId)) {
      throw new Error("Already participating in this challenge");
    }

    // Add user to participants
    await ctx.db.patch(challenge._id, {
      participants: [...challenge.participants, userId],
    });

    // Initialize progress for the new participant
    await ctx.db.insert("challengeProgress", {
      challengeId: challenge._id,
      userId,
      date: new Date().toISOString().split('T')[0],
      completedTasks: challenge.dailyTasks.map((_, index) => ({
        taskIndex: index,
        completed: false,
      })),
      totalScore: 0,
    });

    return challenge._id;
  },
});

export const inviteToChallenge = mutation({
  args: {
    challengeId: v.id("challenges"),
    invitedUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge || challenge.createdBy !== userId) {
      throw new Error("Challenge not found or unauthorized");
    }

    // Check if invitation already exists
    const existingInvitation = await ctx.db
      .query("challengeInvitations")
      .withIndex("by_invited_user", (q) => q.eq("invitedUser", args.invitedUserId))
      .filter((q) => q.eq(q.field("challengeId"), args.challengeId))
      .first();

    if (existingInvitation) {
      throw new Error("User already invited");
    }

    return await ctx.db.insert("challengeInvitations", {
      challengeId: args.challengeId,
      invitedBy: userId,
      invitedUser: args.invitedUserId,
      status: "pending",
      sentAt: Date.now(),
    });
  },
});

export const respondToInvitation = mutation({
  args: {
    invitationId: v.id("challengeInvitations"),
    accept: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation || invitation.invitedUser !== userId) {
      throw new Error("Invitation not found or unauthorized");
    }

    const status = args.accept ? "accepted" : "declined";
    await ctx.db.patch(args.invitationId, {
      status,
      respondedAt: Date.now(),
    });

    if (args.accept) {
      const challenge = await ctx.db.get(invitation.challengeId);
      if (challenge && !challenge.participants.includes(userId)) {
        // Add user to participants
        await ctx.db.patch(challenge._id, {
          participants: [...challenge.participants, userId],
        });

        // Initialize progress
        await ctx.db.insert("challengeProgress", {
          challengeId: challenge._id,
          userId,
          date: new Date().toISOString().split('T')[0],
          completedTasks: challenge.dailyTasks.map((_, index) => ({
            taskIndex: index,
            completed: false,
          })),
          totalScore: 0,
        });
      }
    }

    return invitation.challengeId;
  },
});

export const updateChallengeProgress = mutation({
  args: {
    challengeId: v.id("challenges"),
    date: v.string(),
    taskIndex: v.number(),
    completed: v.boolean(),
    value: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existingProgress = await ctx.db
      .query("challengeProgress")
      .withIndex("by_challenge_and_user", (q) => 
        q.eq("challengeId", args.challengeId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("date"), args.date))
      .first();

    if (existingProgress) {
      const updatedTasks = existingProgress.completedTasks.map((task, index) => 
        index === args.taskIndex 
          ? { ...task, completed: args.completed, value: args.value }
          : task
      );

      const totalScore = updatedTasks.reduce((sum, task) => 
        sum + (task.completed ? 1 : 0), 0
      );

      await ctx.db.patch(existingProgress._id, {
        completedTasks: updatedTasks,
        totalScore,
      });

      return existingProgress._id;
    } else {
      const challenge = await ctx.db.get(args.challengeId);
      if (!challenge) throw new Error("Challenge not found");

      const completedTasks = challenge.dailyTasks.map((_, index) => ({
        taskIndex: index,
        completed: index === args.taskIndex ? args.completed : false,
        value: index === args.taskIndex ? args.value : undefined,
      }));

      return await ctx.db.insert("challengeProgress", {
        challengeId: args.challengeId,
        userId,
        date: args.date,
        completedTasks,
        totalScore: args.completed ? 1 : 0,
      });
    }
  },
});

export const getMyChallenges = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const allChallenges = await ctx.db.query("challenges").collect();
    
    return allChallenges.filter(challenge => 
      challenge.createdBy === userId || challenge.participants.includes(userId)
    );
  },
});

export const getChallengeLeaderboard = query({
  args: {
    challengeId: v.id("challenges"),
  },
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) return [];

    const progressEntries = await ctx.db
      .query("challengeProgress")
      .withIndex("by_challenge", (q) => q.eq("challengeId", args.challengeId))
      .collect();

    // Group by user and calculate total scores
    const userScores = new Map();
    
    for (const progress of progressEntries) {
      const currentScore = userScores.get(progress.userId) || 0;
      userScores.set(progress.userId, currentScore + progress.totalScore);
    }

    // Get user details and create leaderboard
    const leaderboard = [];
    for (const [userId, totalScore] of userScores.entries()) {
      const user = await ctx.db.get(userId);
      if (user) {
        leaderboard.push({
          userId,
          userName: (user as any).name || (user as any).email || "Anonymous",
          totalScore,
        });
      }
    }

    // Sort by score descending
    return leaderboard.sort((a, b) => b.totalScore - a.totalScore);
  },
});

export const getTodaysChallengeProgress = query({
  args: {
    challengeId: v.id("challenges"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const today = new Date().toISOString().split('T')[0];

    return await ctx.db
      .query("challengeProgress")
      .withIndex("by_challenge_and_user", (q) => 
        q.eq("challengeId", args.challengeId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("date"), today))
      .first();
  },
});

export const getPendingInvitations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const invitations = await ctx.db
      .query("challengeInvitations")
      .withIndex("by_invited_user", (q) => q.eq("invitedUser", userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    // Get challenge details for each invitation
    const invitationsWithDetails = [];
    for (const invitation of invitations) {
      const challenge = await ctx.db.get(invitation.challengeId);
      const inviter = await ctx.db.get(invitation.invitedBy);
      
      if (challenge && inviter) {
        invitationsWithDetails.push({
          ...invitation,
          challenge,
          inviterName: inviter.name || inviter.email || "Someone",
        });
      }
    }

    return invitationsWithDetails;
  },
});

export const getChallengeByInviteCode = query({
  args: {
    inviteCode: v.string(),
  },
  handler: async (ctx, args) => {
    // This function doesn't require authentication for the invite preview
    const challenge = await ctx.db
      .query("challenges")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", args.inviteCode))
      .first();

    if (!challenge) {
      return null;
    }

    // Get challenge creator details
    const creator = await ctx.db.get(challenge.createdBy);
    
    return {
      ...challenge,
      creatorName: creator?.name || creator?.email || "Someone",
      participantCount: challenge.participants.length,
    };
  },
});

export const joinChallengeAfterSignup = mutation({
  args: {
    inviteCode: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const challenge = await ctx.db
      .query("challenges")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", args.inviteCode))
      .first();

    if (!challenge) {
      throw new Error("Challenge not found");
    }

    if (challenge.participants.includes(userId)) {
      return challenge._id; // Already participating
    }

    // Add user to participants
    await ctx.db.patch(challenge._id, {
      participants: [...challenge.participants, userId],
    });

    // Initialize progress for the new participant
    await ctx.db.insert("challengeProgress", {
      challengeId: challenge._id,
      userId,
      date: new Date().toISOString().split('T')[0],
      completedTasks: challenge.dailyTasks.map((_, index) => ({
        taskIndex: index,
        completed: false,
      })),
      totalScore: 0,
    });

    return challenge._id;
  },
});

export const removeParticipantFromChallenge = mutation({
  args: {
    challengeId: v.id("challenges"),
    participantId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) {
      throw new Error("Challenge not found");
    }

    // Only the challenge creator can remove participants
    if (challenge.createdBy !== userId) {
      throw new Error("Only the challenge creator can remove participants");
    }

    // Can't remove the creator themselves
    if (args.participantId === challenge.createdBy) {
      throw new Error("Cannot remove the challenge creator");
    }

    // Check if the participant is actually in the challenge
    if (!challenge.participants.includes(args.participantId)) {
      throw new Error("User is not a participant in this challenge");
    }

    // Remove participant from the challenge
    const updatedParticipants = challenge.participants.filter(
      (participantId) => participantId !== args.participantId
    );

    await ctx.db.patch(args.challengeId, {
      participants: updatedParticipants,
    });

    // Remove all progress entries for this participant
    const progressEntries = await ctx.db
      .query("challengeProgress")
      .withIndex("by_challenge_and_user", (q) => 
        q.eq("challengeId", args.challengeId).eq("userId", args.participantId)
      )
      .collect();

    for (const progress of progressEntries) {
      await ctx.db.delete(progress._id);
    }

    return { success: true };
  },
});

export const getChallengeParticipants = query({
  args: {
    challengeId: v.id("challenges"),
  },
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) return [];

    const participants = [];
    for (const participantId of challenge.participants) {
      const user = await ctx.db.get(participantId);
      if (user) {
        participants.push({
          userId: participantId,
          name: (user as any).name || (user as any).email || "Anonymous",
          email: (user as any).email || "",
          isCreator: participantId === challenge.createdBy,
        });
      }
    }

    return participants;
  },
});

export const deleteChallenge = mutation({
  args: {
    challengeId: v.id("challenges"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) {
      throw new Error("Challenge not found");
    }

    // Only the challenge creator can delete the challenge
    if (challenge.createdBy !== userId) {
      throw new Error("Only the challenge creator can delete this challenge");
    }

    // Delete all challenge progress entries
    const progressEntries = await ctx.db
      .query("challengeProgress")
      .withIndex("by_challenge", (q) => q.eq("challengeId", args.challengeId))
      .collect();

    for (const progress of progressEntries) {
      await ctx.db.delete(progress._id);
    }

    // Delete all challenge invitations
    const invitations = await ctx.db
      .query("challengeInvitations")
      .withIndex("by_challenge", (q) => q.eq("challengeId", args.challengeId))
      .collect();

    for (const invitation of invitations) {
      await ctx.db.delete(invitation._id);
    }

    // Finally, delete the challenge itself
    await ctx.db.delete(args.challengeId);

    return { success: true };
  },
});
