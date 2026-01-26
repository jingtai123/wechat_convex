// convex/banners.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requirePermission } from "./lib/auth";

// 获取banner（公开接口）
export const getActiveBanners = query({
  args: {},
  handler: async (ctx) => {
    const banners = await ctx.db
      .query("banners")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // 按sortOrder排序并获取图片URL
    const sortedBanners = banners.sort((a, b) => a.sortOrder - b.sortOrder);

    const bannersWithUrls = await Promise.all(
      sortedBanners.map(async (banner) => {
        const url = await ctx.storage.getUrl(banner.storageId);
        return {
          _id: banner._id,
          name: banner.name,
          url: url,
          sortOrder: banner.sortOrder,
        };
      })
    );

    return bannersWithUrls.filter((b) => b.url !== null);
  },
});

// 生成上传URL（用于上传图片）- 需要系统管理权限 (menuId = 0)
export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    // 验证系统管理权限
    await requirePermission(ctx, args.token, 0);

    return await ctx.storage.generateUploadUrl();
  },
});

// 添加banner记录 - 需要系统管理权限 (menuId = 0)
export const addBanner = mutation({
  args: {
    token: v.string(),
    storageId: v.id("_storage"),
    name: v.string(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    // 验证系统管理权限
    await requirePermission(ctx, args.token, 0);

    const bannerId = await ctx.db.insert("banners", {
      storageId: args.storageId,
      name: args.name,
      sortOrder: args.sortOrder,
      isActive: true,
      createdAt: Date.now(),
    });
    return bannerId;
  },
});

// 删除banner - 需要系统管理权限 (menuId = 0)
export const deleteBanner = mutation({
  args: {
    token: v.string(),
    bannerId: v.id("banners")
  },
  handler: async (ctx, args) => {
    // 验证系统管理权限
    await requirePermission(ctx, args.token, 0);

    const banner = await ctx.db.get(args.bannerId);
    if (banner) {
      // 删除存储的文件
      await ctx.storage.delete(banner.storageId);
      // 删除数据库记录
      await ctx.db.delete(args.bannerId);
    }
    return { success: true };
  },
});

// 切换banner状态 - 需要系统管理权限 (menuId = 0)
export const toggleBannerStatus = mutation({
  args: {
    token: v.string(),
    bannerId: v.id("banners")
  },
  handler: async (ctx, args) => {
    // 验证系统管理权限
    await requirePermission(ctx, args.token, 0);

    const banner = await ctx.db.get(args.bannerId);
    if (banner) {
      await ctx.db.patch(args.bannerId, {
        isActive: !banner.isActive,
      });
    }
    return { success: true };
  },
});

// 获取所有banner（管理员用）
export const getAllBanners = query({
  args: {},
  handler: async (ctx) => {
    const banners = await ctx.db.query("banners").collect();

    const bannersWithUrls = await Promise.all(
      banners
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(async (banner) => {
          const url = await ctx.storage.getUrl(banner.storageId);
          return {
            ...banner,
            url: url,
          };
        })
    );

    return bannersWithUrls;
  },
});
