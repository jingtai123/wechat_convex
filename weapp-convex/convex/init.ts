// convex/init.ts
import { mutation } from "./_generated/server";

// 初始化菜单数据
export const initMenus = mutation({
  args: {},
  handler: async (ctx) => {
    // 检查是否已初始化
    const existingMenus = await ctx.db.query("menus").first();
    if (existingMenus) {
      return { success: false, message: "菜单数据已存在" };
    }

    const menus = [
      {
        menuId: 0,
        name: "系统管理",
        icon: "/images/icon/manager_gold.png",
        page: "/pages/manager/manager",
        type: "page",
        sortOrder: 99,
        isActive: true,
        createdAt: Date.now(),
      },
      {
        menuId: 1,
        name: "系统维护",
        icon: "/images/icon/maintain_gold.png",
        page: "/pages/maintain/maintain",
        type: "page",
        sortOrder: 98,
        isActive: true,
        createdAt: Date.now(),
      },
      {
        menuId: 10,
        name: "电话簿",
        icon: "/images/icon/tel_gold.png",
        page: "/pages/telbook/telbook",
        type: "page",
        sortOrder: 1,
        isActive: true,
        createdAt: Date.now(),
      },
      {
        menuId: 14,
        name: "医保凭证",
        icon: "/images/icon/insurance_gold.png",
        page: "wx7ec43a6a6c80544d",
        type: "miniprogram",
        sortOrder: 5,
        isActive: true,
        createdAt: Date.now(),
      },
      {
        menuId: 99,
        name: "支持开发",
        icon: "/images/icon/support_gold.png", // Assuming icon name
        page: "/pages/support/support",
        type: "page",
        sortOrder: 100, // Put it at the bottom or top as desired, maybe higher number = lower position? existing uses 1, 2, 3, 98, 99. Let's use 100.
        isActive: true,
        createdAt: Date.now(),
      },
    ];

    for (const menu of menus) {
      await ctx.db.insert("menus", menu);
    }

    return { success: true, message: `成功初始化 ${menus.length} 个菜单` };
  },
});

// 初始化角色数据
export const initRoles = mutation({
  args: {},
  handler: async (ctx) => {
    const results: string[] = [];

    // 获取所有菜单ID（管理员拥有全部权限）
    const allMenus = await ctx.db.query("menus").collect();
    const allMenuIds = allMenus.map((m) => m.menuId);

    // 创建管理员角色
    const existingAdmin = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "管理员"))
      .first();

    if (!existingAdmin) {
      await ctx.db.insert("roles", {
        roleId: 0,
        name: "管理员",
        description: "系统管理员，拥有所有权限",
        menuIds: [],
        isDefault: false,
        createdAt: Date.now(),
      });
      results.push("管理员角色创建成功");
    } else {
      results.push("管理员角色已存在");
    }

    // 创建默认角色
    const existingRole = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "普通用户"))
      .first();

    if (!existingRole) {
      await ctx.db.insert("roles", {
        roleId: 1,
        name: "普通用户",
        description: "默认角色，可访问所有基础功能",
        // 普通用户不包含菜单0（系统管理）
        menuIds: [10, 14, 99],
        isDefault: true,
        createdAt: Date.now(),
      });
      results.push("普通用户角色创建成功");
    } else {
      results.push("普通用户角色已存在");
    }

    return { success: true, message: results.join("; ") };
  },
});

// 一键初始化所有数据
export const initAll = mutation({
  args: {},
  handler: async (ctx) => {
    const results: string[] = [];

    // 初始化菜单
    const existingMenus = await ctx.db.query("menus").first();
    if (!existingMenus) {
      const menus = [
        { menuId: 0, name: "系统管理", icon: "/images/icon/manager_gold.png", page: "/pages/manager/manager", type: "page", sortOrder: 99, isActive: true, createdAt: Date.now() },
        { menuId: 1, name: "系统维护", icon: "/images/icon/maintain_gold.png", page: "/pages/maintain/maintain", type: "page", sortOrder: 98, isActive: true, createdAt: Date.now() },
        { menuId: 10, name: "电话簿", icon: "/images/icon/tel_gold.png", page: "/pages/telbook/telbook", type: "page", sortOrder: 1, isActive: true, createdAt: Date.now() },
        { menuId: 14, name: "医保凭证", icon: "/images/icon/insurance_gold.png", page: "wx7ec43a6a6c80544d", type: "miniprogram", sortOrder: 5, isActive: true, createdAt: Date.now() },
        { menuId: 99, name: "支持开发", icon: "/images/icon/support_gold.png", page: "/pages/support/support", type: "page", sortOrder: 100, isActive: true, createdAt: Date.now() },
      ];
      for (const menu of menus) {
        await ctx.db.insert("menus", menu);
      }
      results.push("菜单初始化完成");
    } else {
      results.push("菜单已存在，跳过");
    }

    // 获取所有菜单ID（管理员拥有全部权限）
    const allMenus = await ctx.db.query("menus").collect();
    const allMenuIds = allMenus.map((m) => m.menuId);

    // 初始化管理员角色
    const existingAdmin = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "管理员"))
      .first();

    if (!existingAdmin) {
      await ctx.db.insert("roles", {
        roleId: 0,
        name: "管理员",
        description: "系统管理员，拥有所有权限",
        menuIds: [],
        isDefault: false,
        createdAt: Date.now(),
      });
      results.push("管理员角色创建完成");
    } else {
      results.push("管理员角色已存在，跳过");
    }

    // 初始化默认角色
    const existingRole = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "普通用户"))
      .first();

    if (!existingRole) {
      await ctx.db.insert("roles", {
        roleId: 1,
        name: "普通用户",
        description: "默认角色，可访问所有基础功能",
        menuIds: [10, 14, 99],
        isDefault: true,
        createdAt: Date.now(),
      });
      results.push("普通用户角色创建完成");
    } else {
      results.push("普通用户角色已存在，跳过");
    }

    return { success: true, message: results.join("; ") };
  },
});
