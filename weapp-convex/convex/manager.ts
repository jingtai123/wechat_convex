import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================
// 1. 用户管理 (Users)
// ============================================================

export const listUsers = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("users").collect();
    },
});

export const updateUser = mutation({
    args: {
        id: v.id("users"),
        name: v.optional(v.string()),
        department: v.optional(v.string()),
        roleId: v.optional(v.number()),
        phoneNumber: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        await ctx.db.patch(id, updates);
        return { success: true };
    },
});

export const deleteUser = mutation({
    args: { id: v.id("users") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
        return { success: true };
    },
});

// ============================================================
// 2. 待审核用户管理 (Pending Users)
// ============================================================

export const listPendingUsers = query({
    args: {},
    handler: async (ctx, args) => {
        // 只获取状态为 pending 的
        return await ctx.db
            .query("pendingUsers")
            .withIndex("by_status", (q) => q.eq("status", "pending"))
            .collect();
    },
});

export const approveUser = mutation({
    args: { id: v.id("pendingUsers") },
    handler: async (ctx, args) => {
        const pending = await ctx.db.get(args.id);
        if (!pending) throw new Error("申请不存在");
        if (pending.status !== "pending") throw new Error("申请状态已变更");

        // 1. 更新申请状态
        await ctx.db.patch(args.id, {
            status: "approved",
            reviewedAt: Date.now(),
        });

        // 2. 添加到白名单
        const existingAllowed = await ctx.db
            .query("allowedUsers")
            .withIndex("by_phone", (q) => q.eq("phoneNumber", pending.phoneNumber))
            .first();

        if (!existingAllowed) {
            await ctx.db.insert("allowedUsers", {
                phoneNumber: pending.phoneNumber,
                name: pending.name,
                department: pending.department,
                createdAt: Date.now(),
            });
        }

        // 3. (可选) 如果users表已有记录但未有名字等，可以更新users表
        // 这里简单处理，白名单是登录的关键

        return { success: true };
    },
});

export const rejectUser = mutation({
    args: {
        id: v.id("pendingUsers"),
        reason: v.string()
    },
    handler: async (ctx, args) => {
        const pending = await ctx.db.get(args.id);
        if (!pending) throw new Error("申请不存在");

        await ctx.db.patch(args.id, {
            status: "rejected",
            reviewedAt: Date.now(),
            rejectReason: args.reason,
        });
        return { success: true };
    },
});

// ============================================================
// 3. 菜单管理 (Menus)
// ============================================================

export const listMenus = query({
    args: {},
    handler: async (ctx) => {
        // 获取所有菜单并按sortOrder排序
        const menus = await ctx.db.query("menus").collect();
        return menus.sort((a, b) => a.sortOrder - b.sortOrder);
    },
});

export const createMenu = mutation({
    args: {
        // menuId removed, auto-generated
        name: v.string(),
        icon: v.string(),
        page: v.string(),
        type: v.optional(v.string()),
        sortOrder: v.number(),
        isActive: v.boolean(),
    },
    handler: async (ctx, args) => {
        // Auto-generate menuId: find max existing menuId + 1
        // Since we can't sort nicely by menuId without fetching all, we fetch all.
        // For small tables this is fine.
        const allMenus = await ctx.db.query("menus").collect();
        const maxId = allMenus.reduce((max, m) => (m.menuId > max ? m.menuId : max), 0);
        const newMenuId = maxId + 1;

        await ctx.db.insert("menus", {
            ...args,
            menuId: newMenuId,
            createdAt: Date.now(),
        });
        return { success: true };
    },
});

export const updateMenu = mutation({
    args: {
        id: v.id("menus"),
        menuId: v.optional(v.number()),
        name: v.optional(v.string()),
        icon: v.optional(v.string()),
        page: v.optional(v.string()),
        type: v.optional(v.string()),
        sortOrder: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        await ctx.db.patch(id, updates);
        return { success: true };
    },
});

export const deleteMenu = mutation({
    args: { id: v.id("menus") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
        return { success: true };
    },
});

// ============================================================
// 4. 角色管理 (Roles)
// ============================================================

export const listRoles = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("roles").collect();
    },
});

export const createRole = mutation({
    args: {
        // roleId removed, auto-generated
        name: v.string(),
        description: v.optional(v.string()),
        menuIds: v.array(v.number()),
        isDefault: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        // Auto-generate roleId: find max existing roleId + 1
        const allRoles = await ctx.db.query("roles").collect();
        const maxId = allRoles.reduce((max, r) => (r.roleId > max ? r.roleId : max), 0);
        const newRoleId = maxId + 1;

        await ctx.db.insert("roles", {
            ...args,
            roleId: newRoleId,
            createdAt: Date.now(),
        });
        return { success: true };
    },
});

export const updateRole = mutation({
    args: {
        id: v.id("roles"),
        roleId: v.optional(v.number()),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        menuIds: v.optional(v.array(v.number())),
        isDefault: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        await ctx.db.patch(id, updates);
        return { success: true };
    },
});

export const deleteRole = mutation({
    args: { id: v.id("roles") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
        return { success: true };
    },
});

// ============================================================
// 5. 电话簿管理 (Telbook)
// ============================================================

export const listTelbooks = query({
    args: { search: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (args.search) {
            return await ctx.db
                .query("ssy_telbook")
                .withSearchIndex("search_telbook", (q) => q.search("name", args.search!))
                .take(100);
        }
        return await ctx.db.query("ssy_telbook").collect();
    },
});

export const createTelbook = mutation({
    args: {
        name: v.string(),
        remark: v.string(),
        outPhone: v.string(),
        inPhone: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("ssy_telbook", {
            ...args,
            createdAt: Date.now(),
        });
        return { success: true };
    },
});

export const updateTelbook = mutation({
    args: {
        id: v.id("ssy_telbook"),
        name: v.optional(v.string()),
        remark: v.optional(v.string()),
        outPhone: v.optional(v.string()),
        inPhone: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        await ctx.db.patch(id, updates);
        return { success: true };
    },
});

export const deleteTelbook = mutation({
    args: { id: v.id("ssy_telbook") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
        return { success: true };
    },
});
