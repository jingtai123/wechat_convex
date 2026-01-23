// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 白名单表（仅用于验证用户是否有权限登录）
  allowedUsers: defineTable({
    phoneNumber: v.string(),
    name: v.string(),                    // 必填，用于登录验证
    department: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_phone", ["phoneNumber"])
    .index("by_phone_and_name", ["phoneNumber", "name"]),

  // 待审核用户表
  pendingUsers: defineTable({
    phoneNumber: v.string(),
    name: v.string(),
    department: v.string(),
    status: v.string(),  // "pending" | "approved" | "rejected"
    createdAt: v.number(),
    reviewedAt: v.optional(v.number()),
    rejectReason: v.optional(v.string()),
  })
    .index("by_phone", ["phoneNumber"])
    .index("by_status", ["status"]),

  // 用户表（登录后的用户信息）
  users: defineTable({
    phoneNumber: v.string(),
    token: v.string(),
    lastLogin: v.number(),
    openid: v.optional(v.string()),       // 绑定的微信openid
    name: v.optional(v.string()),
    department: v.optional(v.string()),
    roleId: v.optional(v.number()),       // 角色ID（对应roles.roleId）
  })
    .index("by_token", ["token"])
    .index("by_phone", ["phoneNumber"])
    .index("by_openid", ["openid"]),

  // 角色表
  roles: defineTable({
    roleId: v.number(),                   // 自定义角色ID
    name: v.string(),
    description: v.optional(v.string()),
    menuIds: v.array(v.number()),
    isDefault: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_roleId", ["roleId"])
    .index("by_name", ["name"]),

  // 菜单表
  menus: defineTable({
    menuId: v.number(),
    name: v.string(),
    icon: v.string(),
    page: v.string(),
    type: v.optional(v.string()),  // "page" | "miniprogram"
    sortOrder: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_menuId", ["menuId"])
    .index("by_active", ["isActive"]),

  // Banner轮播图表
  banners: defineTable({
    storageId: v.id("_storage"),      // Convex存储的文件ID
    name: v.string(),                  // 文件名
    sortOrder: v.number(),             // 排序
    isActive: v.boolean(),             // 是否启用
    createdAt: v.number(),
  })
    .index("by_active", ["isActive"])
    .index("by_order", ["sortOrder"]),

  // 电话簿表
  ssy_telbook: defineTable({
    name: v.string(),                  // 部门名称
    remark: v.string(),                // 备注/具体位置
    outPhone: v.string(),              // 外线电话
    inPhone: v.string(),               // 内线电话
    createdAt: v.number(),
  })
    .index("by_name", ["name"])
    .searchIndex("search_telbook", {
      searchField: "name",
      filterFields: ["remark"],
    }),
});
