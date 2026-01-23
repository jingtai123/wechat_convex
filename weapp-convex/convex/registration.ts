// convex/registration.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// 提交注册申请
export const submitRegistration = mutation({
  args: {
    phoneNumber: v.string(),
    name: v.string(),
    department: v.string(),
  },
  handler: async (ctx, args) => {
    const { phoneNumber, name, department } = args;

    // 1. 检查手机号格式
    if (!/^1\d{10}$/.test(phoneNumber)) {
      return { success: false, message: "请输入正确的手机号" };
    }

    // 2. 检查是否已在白名单中
    const existingAllowed = await ctx.db
      .query("allowedUsers")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", phoneNumber))
      .first();

    if (existingAllowed) {
      return { success: false, message: "该手机号已有访问权限，请直接登录" };
    }

    // 3. 检查是否已提交过申请
    const existingPending = await ctx.db
      .query("pendingUsers")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", phoneNumber))
      .first();

    if (existingPending) {
      if (existingPending.status === "pending") {
        return { success: false, message: "您已提交申请，请等待审核" };
      }
      if (existingPending.status === "rejected") {
        // 允许重新申请，更新记录
        await ctx.db.patch(existingPending._id, {
          name,
          department,
          status: "pending",
          createdAt: Date.now(),
          rejectReason: undefined,
          reviewedAt: undefined,
        });
        return { success: true, message: "注册申请已重新提交，请等待审核" };
      }
    }

    // 4. 创建新的待审核记录
    await ctx.db.insert("pendingUsers", {
      phoneNumber,
      name,
      department,
      status: "pending",
      createdAt: Date.now(),
    });

    return { success: true, message: "注册申请已提交，请等待管理员审核" };
  },
});

// 查询注册状态
export const getRegistrationStatus = query({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("pendingUsers")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    if (!pending) {
      return { found: false };
    }

    return {
      found: true,
      status: pending.status,
      createdAt: pending.createdAt,
      reviewedAt: pending.reviewedAt,
      rejectReason: pending.rejectReason,
    };
  },
});

// 管理员审核通过
export const approveRegistration = mutation({
  args: { pendingUserId: v.id("pendingUsers") },
  handler: async (ctx, args) => {
    const pending = await ctx.db.get(args.pendingUserId);
    if (!pending) {
      return { success: false, message: "申请记录不存在" };
    }

    if (pending.status !== "pending") {
      return { success: false, message: "该申请已处理" };
    }

    // 添加到白名单（roleId会在用户首次登录时分配到users表）
    await ctx.db.insert("allowedUsers", {
      phoneNumber: pending.phoneNumber,
      name: pending.name,
      department: pending.department,
      createdAt: Date.now(),
    });

    // 更新申请状态
    await ctx.db.patch(args.pendingUserId, {
      status: "approved",
      reviewedAt: Date.now(),
    });

    return { success: true, message: "审核通过" };
  },
});

// 管理员拒绝申请
export const rejectRegistration = mutation({
  args: {
    pendingUserId: v.id("pendingUsers"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const pending = await ctx.db.get(args.pendingUserId);
    if (!pending) {
      return { success: false, message: "申请记录不存在" };
    }

    if (pending.status !== "pending") {
      return { success: false, message: "该申请已处理" };
    }

    await ctx.db.patch(args.pendingUserId, {
      status: "rejected",
      reviewedAt: Date.now(),
      rejectReason: args.reason || "审核未通过",
    });

    return { success: true, message: "已拒绝该申请" };
  },
});

// 获取所有待审核申请（管理员用）
export const getPendingRegistrations = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("pendingUsers")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();
  },
});
