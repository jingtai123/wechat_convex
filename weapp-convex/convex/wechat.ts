// convex/wechat.ts
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// 定义返回类型
type LoginResult =
  | { success: true; token: string }
  | { success: false; message: string };

export const loginWithManualInput = action({
  // 接收前端传来的 code、手机号和姓名
  args: {
    code: v.string(),
    phoneNumber: v.string(),
    name: v.string()  // 新增姓名参数
  },
  handler: async (ctx, args): Promise<LoginResult> => {
    const appId = process.env.WECHAT_APP_ID;
    const secret = process.env.WECHAT_APP_SECRET;

    if (!appId || !secret) throw new Error("缺少微信环境变量");

    // 1. 使用 code 换取 OpenID
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${secret}&js_code=${args.code}&grant_type=authorization_code`;

    const resp = await fetch(url);
    const data = await resp.json();

    if (data.errcode) {
      return { success: false, message: "微信登录失败: " + data.errmsg };
    }

    const openid = data.openid;

    // 2. 调用内部 Mutation，验证手机号、姓名并绑定 OpenID
    const result = await ctx.runMutation(internal.auth.checkManualLogin, {
      phoneNumber: args.phoneNumber,
      openid: openid,
      name: args.name,
    });

    return result;
  },
});
