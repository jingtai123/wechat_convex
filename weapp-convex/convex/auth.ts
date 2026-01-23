// convex/auth.ts
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

type LoginResult =
  | { success: true; token: string }
  | { success: false; message: string };

export const checkManualLogin = internalMutation({
  args: {
    phoneNumber: v.string(),
    openid: v.string(),
    name: v.string()
  },
  handler: async (ctx, args): Promise<LoginResult> => {
    // 1. 首先查users表，检查该手机号是否已有用户记录
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    // 生成新Token
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

    // 情况一：用户已存在于users表
    if (existingUser) {
      // 验证openid绑定
      if (existingUser.openid && existingUser.openid !== args.openid) {
        return {
          success: false,
          message: "登录失败：该手机号已绑定其他微信号，请联系管理员解绑。"
        };
      }

      // 更新用户记录（更新token、lastLogin，首次则绑定openid）
      await ctx.db.patch(existingUser._id, {
        token: token,
        lastLogin: Date.now(),
        openid: existingUser.openid || args.openid,
      });

      return { success: true, token: token };
    }

    // 情况二：用户不存在于users表，需要验证白名单
    const allowedUser = await ctx.db
      .query("allowedUsers")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    if (!allowedUser) {
      return { success: false, message: "该手机号未授权访问" };
    }

    // 验证姓名
    if (allowedUser.name && allowedUser.name !== args.name) {
      return { success: false, message: "姓名验证失败，请检查输入" };
    }

    // 创建新用户记录到users表（默认roleId为1普通用户）
    await ctx.db.insert("users", {
      phoneNumber: args.phoneNumber,
      token: token,
      lastLogin: Date.now(),
      openid: args.openid,
      name: allowedUser.name || args.name,
      department: allowedUser.department,
      roleId: 1,
    });

    return { success: true, token: token };
  },
});

// 根据 Token 获取用户信息
export const getUserByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    return user;
  },
});



// 根据角色ID获取角色信息
export const getRoleById = query({
  args: { roleId: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("roles")
      .withIndex("by_roleId", (q) => q.eq("roleId", args.roleId))
      .first();
  },
});

// 批量导入白名单用户
export const batchImportAllowedUsers = mutation({
  args: {
    users: v.array(v.object({
      name: v.string(),
      phoneNumber: v.string(),
      department: v.optional(v.string()),
    }))
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let inserted = 0;
    let skipped = 0;

    for (const user of args.users) {
      // 检查是否已存在
      const existing = await ctx.db
        .query("allowedUsers")
        .withIndex("by_phone", (q) => q.eq("phoneNumber", user.phoneNumber))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("allowedUsers", {
        phoneNumber: user.phoneNumber,
        name: user.name,
        department: user.department,
        createdAt: now,
      });
      inserted++;
    }

    return { success: true, inserted, skipped };
  },
});
