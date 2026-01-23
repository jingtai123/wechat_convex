// convex/menus.ts
import { v } from "convex/values";
import { query } from "./_generated/server";

// 获取用户可访问的菜单
export const getUserMenus = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    // 1. 通过 token 获取用户信息
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!user) {
      return { success: false, message: "用户未登录", menus: [] };
    }

    // 2. 获取所有活跃菜单
    const allMenus = await ctx.db
      .query("menus")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // 3. 管理员（roleId=0）直接返回所有菜单
    if (user.roleId === 0) {
      const userMenus = allMenus
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((menu) => ({
          _id: menu.menuId,
          name: menu.name,
          icon: menu.icon,
          page: menu.page,
          type: menu.type || "page",
        }));
      return { success: true, menus: userMenus };
    }

    // 4. 普通用户根据角色获取菜单
    let menuIds: number[] = [];

    if (user.roleId !== undefined) {
      const userRoleId = user.roleId;
      const role = await ctx.db
        .query("roles")
        .withIndex("by_roleId", (q) => q.eq("roleId", userRoleId))
        .first();
      if (role) {
        menuIds = role.menuIds;
      }
    }

    // 5. 如果没有角色，使用默认角色（roleId=1）
    if (menuIds.length === 0) {
      const defaultRole = await ctx.db
        .query("roles")
        .withIndex("by_roleId", (q) => q.eq("roleId", 1))
        .first();

      if (defaultRole) {
        menuIds = defaultRole.menuIds;
      }
    }

    // 6. 过滤出用户可访问的菜单
    const userMenus = allMenus
      .filter((menu) => menuIds.includes(menu.menuId))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((menu) => ({
        _id: menu.menuId,
        name: menu.name,
        icon: menu.icon,
        page: menu.page,
        type: menu.type || "page",
      }));

    return { success: true, menus: userMenus };
  },
});

// 获取所有活跃菜单（管理员用）
export const getAllMenus = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("menus")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .order("asc")
      .collect();
  },
});

// 根据菜单ID获取单个菜单
export const getMenuById = query({
  args: { menuId: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("menus")
      .withIndex("by_menuId", (q) => q.eq("menuId", args.menuId))
      .first();
  },
});
