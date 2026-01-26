import { httpRouter } from "convex/server";
import { httpAction, ActionCtx } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// ============================================================
// 0. 统一错误处理包装函数
// ============================================================
/**
 * 包装路由处理器，统一处理错误并返回给前端
 */
const withErrorHandling = (
  handler: (ctx: ActionCtx, request: Request, user?: any) => Promise<Response>
) => {
  return async (ctx: ActionCtx, request: Request, user?: any): Promise<Response> => {
    try {
      return await handler(ctx, request, user);
    } catch (error: any) {
      console.error('路由错误:', error);

      // 构造错误响应
      const errorResponse = {
        success: false,
        message: error.message || '操作失败，请稍后重试'
      };

      // 根据错误类型返回不同的状态码
      let statusCode = 500;
      if (error.message?.includes('权限') || error.message?.includes('无权')) {
        statusCode = 403;
      } else if (error.message?.includes('认证') || error.message?.includes('Token')) {
        statusCode = 401;
      }

      return new Response(JSON.stringify(errorResponse), {
        status: statusCode,
        headers: { "Content-Type": "application/json" }
      });
    }
  };
};

// ============================================================
// 1. 定义鉴权中间件
// ============================================================
const authorizedAction = (
  handler: (ctx: ActionCtx, request: Request, user: any) => Promise<Response>
) => {
  return httpAction(withErrorHandling(async (ctx, request) => {
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
  }));
};

// ============================================================
// 1.1 定义管理员权限中间件
// ============================================================
const permAction = (
  requiredMenuId: number,
  handler: (ctx: ActionCtx, request: Request, user: any) => Promise<Response>
) => {
  return authorizedAction(withErrorHandling(async (ctx, request, user) => {
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
  }));

};

// ============================================================
// 2. 公开接口
// ============================================================
// [公开接口] 微信手动登录
http.route({
  path: "/wx/manual-login",
  method: "POST",
  handler: httpAction(withErrorHandling(async (ctx, request) => {
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
  })),
});

// [公开接口] 自动登录检查
http.route({
  path: "/wx/check-auth",
  method: "POST",
  handler: httpAction(withErrorHandling(async (ctx, request) => {
    const { token } = await request.json();
    if (!token) return new Response(JSON.stringify({ ok: false }), { status: 200 });

    const user = await ctx.runQuery(api.auth.getUserByToken, { token });

    return new Response(JSON.stringify({ ok: !!user, userId: user?._id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  })),
});

// [公开接口] 提交注册申请
http.route({
  path: "/wx/register",
  method: "POST",
  handler: httpAction(withErrorHandling(async (ctx, request) => {
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
  })),
});

// [公开接口] 查询注册状态
http.route({
  path: "/wx/register/status",
  method: "POST",
  handler: httpAction(withErrorHandling(async (ctx, request) => {
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
  })),
});

// [公开接口] 获取活跃的Banner轮播图
http.route({
  path: "/wx/banners",
  method: "GET",
  handler: httpAction(withErrorHandling(async (ctx) => {
    const banners = await ctx.runQuery(api.banners.getActiveBanners);

    return new Response(JSON.stringify({
      success: true,
      banners: banners.map(b => b.url)
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  })),
});

// ============================================================
// 3. 受保护接口
// ============================================================

// [受保护接口] 获取电话簿数据 - 需要电话簿查看权限 (menuId = 10)
http.route({
  path: "/wx/telbook",
  method: "GET",
  handler: permAction(10, async (ctx, request, user) => {
    const token = request.headers.get("Authorization")!;
    const records = await ctx.runQuery(api.telbook.getAllTelbook, { token });

    return new Response(JSON.stringify({
      success: true,
      data: records
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
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
    const token = request.headers.get("Authorization");
    if (!token) throw new Error("Token 缺失");
    const result = await ctx.runQuery(api.menus.getUserMenus, { token });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ============================================================
// 4. 管理员接口 (Manager) - 全部升级为 adminAction
// ============================================================

// --- Users ---
http.route({
  path: "/wx/manager/users",
  method: "GET",
  handler: permAction(0, async (ctx, request, user) => {
    const token = request.headers.get("Authorization")!;
    const data = await ctx.runQuery(api.manager.listUsers, { token });
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});
http.route({
  path: "/wx/manager/users/update",
  method: "POST",
  handler: permAction(0, async (ctx, request, user) => {
    const token = request.headers.get("Authorization")!;
    const args = await request.json();
    await ctx.runMutation(api.manager.updateUser, { ...args, token });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});
http.route({
  path: "/wx/manager/users/delete",
  method: "POST",
  handler: permAction(0, async (ctx, request, user) => {
    const token = request.headers.get("Authorization")!;
    const args = await request.json();
    await ctx.runMutation(api.manager.deleteUser, { ...args, token });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// --- Pending Users ---
http.route({
  path: "/wx/manager/pending-users",
  method: "GET",
  handler: permAction(0, async (ctx, request, user) => {
    const token = request.headers.get("Authorization")!;
    const data = await ctx.runQuery(api.manager.listPendingUsers, { token });
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});
http.route({
  path: "/wx/manager/pending-users/approve",
  method: "POST",
  handler: permAction(0, async (ctx, request, user) => {
    const token = request.headers.get("Authorization")!;
    const args = await request.json();
    await ctx.runMutation(api.manager.approveUser, { ...args, token });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});
http.route({
  path: "/wx/manager/pending-users/reject",
  method: "POST",
  handler: permAction(0, async (ctx, request, user) => {
    const token = request.headers.get("Authorization")!;
    const args = await request.json();
    await ctx.runMutation(api.manager.rejectUser, { ...args, token });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// --- Menus ---
http.route({
  path: "/wx/manager/menus",
  method: "GET",
  handler: permAction(0, async (ctx, request, user) => {
    const token = request.headers.get("Authorization")!;
    const data = await ctx.runQuery(api.manager.listMenus, { token });
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});
http.route({
  path: "/wx/manager/menus/create",
  method: "POST",
  handler: permAction(0, async (ctx, request, user) => {
    const token = request.headers.get("Authorization")!;
    const args = await request.json();
    await ctx.runMutation(api.manager.createMenu, { ...args, token });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});
http.route({
  path: "/wx/manager/menus/update",
  method: "POST",
  handler: permAction(0, async (ctx, request, user) => {
    const token = request.headers.get("Authorization")!;
    const args = await request.json();
    await ctx.runMutation(api.manager.updateMenu, { ...args, token });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});
http.route({
  path: "/wx/manager/menus/delete",
  method: "POST",
  handler: permAction(0, async (ctx, request, user) => {
    const token = request.headers.get("Authorization")!;
    const args = await request.json();
    await ctx.runMutation(api.manager.deleteMenu, { ...args, token });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// --- Roles ---
http.route({
  path: "/wx/manager/roles",
  method: "GET",
  handler: permAction(0, async (ctx, request, user) => {
    const token = request.headers.get("Authorization")!;
    const data = await ctx.runQuery(api.manager.listRoles, { token });
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});
http.route({
  path: "/wx/manager/roles/create",
  method: "POST",
  handler: permAction(0, async (ctx, request, user) => {
    const token = request.headers.get("Authorization")!;
    const args = await request.json();
    await ctx.runMutation(api.manager.createRole, { ...args, token });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});
http.route({
  path: "/wx/manager/roles/update",
  method: "POST",
  handler: permAction(0, async (ctx, request, user) => {
    const token = request.headers.get("Authorization")!;
    const args = await request.json();
    await ctx.runMutation(api.manager.updateRole, { ...args, token });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});
http.route({
  path: "/wx/manager/roles/delete",
  method: "POST",
  handler: permAction(0, async (ctx, request, user) => {
    const token = request.headers.get("Authorization")!;
    const args = await request.json();
    await ctx.runMutation(api.manager.deleteRole, { ...args, token });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// --- Telbook (Manager) - 需要系统维护权限 (menuId = 1)
http.route({
  path: "/wx/manager/telbook",
  method: "GET",
  handler: permAction(1, async (ctx, request, user) => {
    const token = request.headers.get("Authorization")!;
    const data = await ctx.runQuery(api.manager.listTelbooks, { token });
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});
http.route({
  path: "/wx/manager/telbook/create",
  method: "POST",
  handler: permAction(1, async (ctx, request, user) => {
    const token = request.headers.get("Authorization")!;
    const args = await request.json();
    await ctx.runMutation(api.manager.createTelbook, { ...args, token });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});
http.route({
  path: "/wx/manager/telbook/update",
  method: "POST",
  handler: permAction(1, async (ctx, request, user) => {
    const token = request.headers.get("Authorization")!;
    const args = await request.json();
    await ctx.runMutation(api.manager.updateTelbook, { ...args, token });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});
http.route({
  path: "/wx/manager/telbook/delete",
  method: "POST",
  handler: permAction(1, async (ctx, request, user) => {
    const token = request.headers.get("Authorization")!;
    const args = await request.json();
    await ctx.runMutation(api.manager.deleteTelbook, { ...args, token });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
