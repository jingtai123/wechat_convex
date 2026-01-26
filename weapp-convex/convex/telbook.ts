// convex/telbook.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requirePermission } from "./lib/auth";

// 获取所有电话簿数据 - 需要电话簿查看权限 (menuId = 10)
export const getAllTelbook = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    // 验证电话簿查看权限
    await requirePermission(ctx, args.token, 10);

    const records = await ctx.db.query("ssy_telbook").collect();
    // 转换为前端期望的格式
    return records.map((r) => ({
      NAME: r.name,
      REMARK: r.remark,
      OUTPHONE: r.outPhone,
      INPHONE: r.inPhone,
    }));
  },
});

// 批量导入电话簿数据 - 需要系统维护权限 (menuId = 1)
export const batchImportTelbook = mutation({
  args: {
    token: v.string(),
    records: v.array(
      v.object({
        name: v.string(),
        remark: v.string(),
        outPhone: v.string(),
        inPhone: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // 验证系统维护权限
    await requirePermission(ctx, args.token, 1);

    // 限制单次导入数量
    if (args.records.length > 1000) {
      throw new Error("单次最多导入1000条记录，请分批导入");
    }

    const now = Date.now();
    let inserted = 0;

    for (const record of args.records) {
      await ctx.db.insert("ssy_telbook", {
        name: record.name,
        remark: record.remark,
        outPhone: record.outPhone,
        inPhone: record.inPhone,
        createdAt: now,
      });
      inserted++;
    }

    return { success: true, inserted };
  },
});

// 清空电话簿（用于重新导入）- 需要系统维护权限，危险操作
export const clearTelbook = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    // 验证系统维护权限
    await requirePermission(ctx, args.token, 1);

    const records = await ctx.db.query("ssy_telbook").collect();

    // 额外保护：如果记录过多，拒绝清空，要求分批删除
    if (records.length > 10000) {
      throw new Error("记录过多（超过10000条），为防止误操作，请使用管理后台分批删除");
    }

    for (const record of records) {
      await ctx.db.delete(record._id);
    }
    return { success: true, deleted: records.length };
  },
});

// 添加单条电话记录 - 需要系统维护权限 (menuId = 1)
export const addTelRecord = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    remark: v.string(),
    outPhone: v.string(),
    inPhone: v.string(),
  },
  handler: async (ctx, args) => {
    // 验证系统维护权限
    await requirePermission(ctx, args.token, 1);

    const id = await ctx.db.insert("ssy_telbook", {
      name: args.name,
      remark: args.remark,
      outPhone: args.outPhone,
      inPhone: args.inPhone,
      createdAt: Date.now(),
    });
    return { success: true, id };
  },
});

// 删除电话记录 - 需要系统维护权限 (menuId = 1)
export const deleteTelRecord = mutation({
  args: {
    token: v.string(),
    id: v.id("ssy_telbook")
  },
  handler: async (ctx, args) => {
    // 验证系统维护权限
    await requirePermission(ctx, args.token, 1);

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// 更新电话记录 - 需要系统维护权限 (menuId = 1)
export const updateTelRecord = mutation({
  args: {
    token: v.string(),
    id: v.id("ssy_telbook"),
    name: v.string(),
    remark: v.string(),
    outPhone: v.string(),
    inPhone: v.string(),
  },
  handler: async (ctx, args) => {
    // 验证系统维护权限
    await requirePermission(ctx, args.token, 1);

    await ctx.db.patch(args.id, {
      name: args.name,
      remark: args.remark,
      outPhone: args.outPhone,
      inPhone: args.inPhone,
    });
    return { success: true };
  },
});
