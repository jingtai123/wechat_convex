import { httpRouter } from "convex/server";
import { httpAction, ActionCtx } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// ============================================================
// 1. 定义鉴权中间件
// ============================================================
const authorizedAction = (
  handler: (ctx: ActionCtx, request: Request, user: any) => Promise<Response>
) => {
  return httpAction(async (ctx, request) => {
    const token = request.headers.get("Authorization");

    if (!token) {
      return new Response(JSON.stringify({
        success: false,
        message: "未授权: 缺少 Token"
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const user = await ctx.runQuery(api.auth.getUserByToken, { token });

    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        message: "未授权: Token 无效或已过期"
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    return handler(ctx, request, user);
  });
};

// ============================================================
// 1.1 定义管理员权限中间件
// ============================================================
const permAction = (
  requiredMenuId: number,
  handler: (ctx: ActionCtx, request: Request, user: any) => Promise<Response>
) => {
  return authorizedAction(async (ctx, request, user) => {
    // 1. 获取用户角色
    const role = await ctx.runQuery(api.auth.getRoleById, { roleId: user.roleId });

    if (!role) {
      return new Response(JSON.stringify({
        success: false,
        message: "无权访问: 角色不存在"
      }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. 检查权限
    // 管理员(ID 0)默认拥有所有权限，或者检查 menuIds 是否包含所需菜单
    const hasPermission = role.roleId === 0 || (role.menuIds && role.menuIds.includes(requiredMenuId));

    if (!hasPermission) {
      return new Response(JSON.stringify({
        success: false,
        message: `无权访问: 需要权限 [MenuID: ${requiredMenuId}]`
      }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    return handler(ctx, request, user);
  });

};

// ============================================================
// 2. 公开接口
// ============================================================
// [公开接口] 微信手动登录
http.route({
  path: "/wx/manual-login",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const { code, phoneNumber, name } = await request.json();

    // 参数校验
    if (!code || !phoneNumber || !name) {
      return new Response(JSON.stringify({
        success: false,
        message: "请填写完整的登录信息"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await ctx.runAction(api.wechat.loginWithManualInput, {
      code,
      phoneNumber,
      name
    });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// [公开接口] 自动登录检查
http.route({
  path: "/wx/check-auth",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const { token } = await request.json();
    if (!token) return new Response(JSON.stringify({ ok: false }), { status: 200 });

    const user = await ctx.runQuery(api.auth.getUserByToken, { token });

    return new Response(JSON.stringify({ ok: !!user, userId: user?._id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// [公开接口] 提交注册申请
http.route({
  path: "/wx/register",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const { phoneNumber, name, department } = await request.json();

      if (!phoneNumber || !name || !department) {
        return new Response(JSON.stringify({
          success: false,
          message: "请填写完整的注册信息"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const result = await ctx.runMutation(api.registration.submitRegistration, {
        phoneNumber,
        name,
        department
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        success: false,
        message: error.message || "注册失败"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// [公开接口] 查询注册状态
http.route({
  path: "/wx/register/status",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const { phoneNumber } = await request.json();

      if (!phoneNumber) {
        return new Response(JSON.stringify({
          success: false,
          message: "请提供手机号"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const result = await ctx.runQuery(api.registration.getRegistrationStatus, {
        phoneNumber
      });

      return new Response(JSON.stringify({ success: true, data: result }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        success: false,
        message: error.message || "查询失败"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// [公开接口] 获取活跃的Banner轮播图
http.route({
  path: "/wx/banners",
  method: "GET",
  handler: httpAction(async (ctx) => {
    try {
      const banners = await ctx.runQuery(api.banners.getActiveBanners);

      return new Response(JSON.stringify({
        success: true,
        banners: banners.map(b => b.url)
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        success: false,
        message: error.message || "获取Banner失败",
        banners: []
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// ============================================================
// 3. 受保护接口
// ============================================================

// [受保护接口] 获取电话簿数据
http.route({
  path: "/wx/telbook",
  method: "GET",
  handler: permAction(10, async (ctx) => {
    try {
      const records = await ctx.runQuery(api.telbook.getAllTelbook);

      return new Response(JSON.stringify({
        success: true,
        data: records
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        success: false,
        message: error.message || "获取电话簿失败",
        data: []
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// [受保护接口] 获取用户个人资料
http.route({
  path: "/wx/profile",
  method: "GET",
  handler: authorizedAction(async (ctx, request, user) => {
    return new Response(JSON.stringify({
      success: true,
      data: {
        id: user._id,
        phone: user.phoneNumber,
        name: user.name || "未设置昵称",
        department: user.department,
        lastLoginTime: new Date(user.lastLogin).toLocaleString()
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// [受保护接口] 获取用户菜单
http.route({
  path: "/wx/menus",
  method: "GET",
  handler: authorizedAction(async (ctx, request, user) => {
    try {
      const token = request.headers.get("Authorization");
      if (!token) throw new Error("Token 缺失");
      const result = await ctx.runQuery(api.menus.getUserMenus, { token });
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        success: false,
        message: error.message || "获取菜单失败",
        menus: []
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// ============================================================
// 4. 管理员接口 (Manager) - 全部升级为 adminAction
// ============================================================

// --- Users ---
http.route({
  path: "/wx/manager/users",
  method: "GET",
  handler: permAction(0, async (ctx) => {
    const data = await ctx.runQuery(api.manager.listUsers, {});
    return new Response(JSON.stringify({ success: true, data }));
  }),
});
http.route({
  path: "/wx/manager/users/update",
  method: "POST",
  handler: permAction(0, async (ctx, req) => {
    const args = await req.json();
    await ctx.runMutation(api.manager.updateUser, args);
    return new Response(JSON.stringify({ success: true }));
  }),
});
http.route({
  path: "/wx/manager/users/delete",
  method: "POST",
  handler: permAction(0, async (ctx, req) => {
    const args = await req.json();
    await ctx.runMutation(api.manager.deleteUser, args);
    return new Response(JSON.stringify({ success: true }));
  }),
});

// --- Pending Users ---
http.route({
  path: "/wx/manager/pending-users",
  method: "GET",
  handler: permAction(0, async (ctx) => {
    const data = await ctx.runQuery(api.manager.listPendingUsers, {});
    return new Response(JSON.stringify({ success: true, data }));
  }),
});
http.route({
  path: "/wx/manager/pending-users/approve",
  method: "POST",
  handler: permAction(0, async (ctx, req) => {
    const args = await req.json();
    await ctx.runMutation(api.manager.approveUser, args);
    return new Response(JSON.stringify({ success: true }));
  }),
});
http.route({
  path: "/wx/manager/pending-users/reject",
  method: "POST",
  handler: permAction(0, async (ctx, req) => {
    const args = await req.json();
    await ctx.runMutation(api.manager.rejectUser, args);
    return new Response(JSON.stringify({ success: true }));
  }),
});

// --- Menus ---
http.route({
  path: "/wx/manager/menus",
  method: "GET",
  handler: permAction(0, async (ctx) => {
    const data = await ctx.runQuery(api.manager.listMenus, {});
    return new Response(JSON.stringify({ success: true, data }));
  }),
});
http.route({
  path: "/wx/manager/menus/create",
  method: "POST",
  handler: permAction(0, async (ctx, req) => {
    const args = await req.json();
    await ctx.runMutation(api.manager.createMenu, args);
    return new Response(JSON.stringify({ success: true }));
  }),
});
http.route({
  path: "/wx/manager/menus/update",
  method: "POST",
  handler: permAction(0, async (ctx, req) => {
    const args = await req.json();
    await ctx.runMutation(api.manager.updateMenu, args);
    return new Response(JSON.stringify({ success: true }));
  }),
});
http.route({
  path: "/wx/manager/menus/delete",
  method: "POST",
  handler: permAction(0, async (ctx, req) => {
    const args = await req.json();
    await ctx.runMutation(api.manager.deleteMenu, args);
    return new Response(JSON.stringify({ success: true }));
  }),
});

// --- Roles ---
http.route({
  path: "/wx/manager/roles",
  method: "GET",
  handler: permAction(0, async (ctx) => {
    const data = await ctx.runQuery(api.manager.listRoles, {});
    return new Response(JSON.stringify({ success: true, data }));
  }),
});
http.route({
  path: "/wx/manager/roles/create",
  method: "POST",
  handler: permAction(0, async (ctx, req) => {
    const args = await req.json();
    await ctx.runMutation(api.manager.createRole, args);
    return new Response(JSON.stringify({ success: true }));
  }),
});
http.route({
  path: "/wx/manager/roles/update",
  method: "POST",
  handler: permAction(0, async (ctx, req) => {
    const args = await req.json();
    await ctx.runMutation(api.manager.updateRole, args);
    return new Response(JSON.stringify({ success: true }));
  }),
});
http.route({
  path: "/wx/manager/roles/delete",
  method: "POST",
  handler: permAction(0, async (ctx, req) => {
    const args = await req.json();
    await ctx.runMutation(api.manager.deleteRole, args);
    return new Response(JSON.stringify({ success: true }));
  }),
});

// --- Telbook ---
http.route({
  path: "/wx/manager/telbook",
  method: "GET",
  handler: permAction(1, async (ctx) => {
    const data = await ctx.runQuery(api.manager.listTelbooks, {});
    return new Response(JSON.stringify({ success: true, data }));
  }),
});
http.route({
  path: "/wx/manager/telbook/create",
  method: "POST",
  handler: permAction(1, async (ctx, req) => {
    const args = await req.json();
    await ctx.runMutation(api.manager.createTelbook, args);
    return new Response(JSON.stringify({ success: true }));
  }),
});
http.route({
  path: "/wx/manager/telbook/update",
  method: "POST",
  handler: permAction(1, async (ctx, req) => {
    const args = await req.json();
    await ctx.runMutation(api.manager.updateTelbook, args);
    return new Response(JSON.stringify({ success: true }));
  }),
});
http.route({
  path: "/wx/manager/telbook/delete",
  method: "POST",
  handler: permAction(1, async (ctx, req) => {
    const args = await req.json();
    await ctx.runMutation(api.manager.deleteTelbook, args);
    return new Response(JSON.stringify({ success: true }));
  }),
});

export default http;
