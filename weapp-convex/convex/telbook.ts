// convex/telbook.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// 获取所有电话簿数据
export const getAllTelbook = query({
  args: {},
  handler: async (ctx) => {
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

// 批量导入电话簿数据
export const batchImportTelbook = mutation({
  args: {
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

// 清空电话簿（用于重新导入）
export const clearTelbook = mutation({
  args: {},
  handler: async (ctx) => {
    const records = await ctx.db.query("ssy_telbook").collect();
    for (const record of records) {
      await ctx.db.delete(record._id);
    }
    return { success: true, deleted: records.length };
  },
});

// 添加单条电话记录
export const addTelRecord = mutation({
  args: {
    name: v.string(),
    remark: v.string(),
    outPhone: v.string(),
    inPhone: v.string(),
  },
  handler: async (ctx, args) => {
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

// 删除电话记录
export const deleteTelRecord = mutation({
  args: { id: v.id("ssy_telbook") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// 更新电话记录
export const updateTelRecord = mutation({
  args: {
    id: v.id("ssy_telbook"),
    name: v.string(),
    remark: v.string(),
    outPhone: v.string(),
    inPhone: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      name: args.name,
      remark: args.remark,
      outPhone: args.outPhone,
      inPhone: args.inPhone,
    });
    return { success: true };
  },
});
