// convex/lib/auth.ts
// 权限验证工具函数

import { QueryCtx, MutationCtx } from "../_generated/server";

/**
 * 验证用户是否已认证
 * @throws Error 如果用户未认证
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx, token: string) {
  if (!token) {
    throw new Error("未提供认证Token");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("token", token))
    .first();

  if (!user) {
    throw new Error("无效的Token");
  }

  return user;
}

/**
 * 验证用户是否为管理员
 * @throws Error 如果用户不是管理员
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx, token: string) {
  const user = await requireAuth(ctx, token);

  if (user.roleId !== 0) {
    throw new Error("需要管理员权限");
  }

  return user;
}

/**
 * 验证用户是否有指定菜单权限
 * @param requiredMenuId 需要的菜单权限ID，0表示需要管理员权限
 */
export async function requirePermission(
  ctx: QueryCtx | MutationCtx,
  token: string,
  requiredMenuId: number
) {
  const user = await requireAuth(ctx, token);

  // 管理员(roleId=0)拥有所有权限
  if (user.roleId === 0) {
    return user;
  }

  // 获取用户角色
  const role = await ctx.db
    .query("roles")
    .withIndex("by_roleId", (q) => q.eq("roleId", user.roleId ?? 1))
    .first();

  if (!role) {
    throw new Error("用户角色不存在");
  }

  // 检查是否有所需权限
  const hasPermission = role.menuIds && role.menuIds.includes(requiredMenuId);

  if (!hasPermission) {
    throw new Error(`权限不足：需要菜单权限 [${requiredMenuId}]`);
  }

  return user;
}
