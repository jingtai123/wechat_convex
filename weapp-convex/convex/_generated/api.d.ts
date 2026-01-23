/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as banners from "../banners.js";
import type * as http from "../http.js";
import type * as init from "../init.js";
import type * as manager from "../manager.js";
import type * as menus from "../menus.js";
import type * as registration from "../registration.js";
import type * as telbook from "../telbook.js";
import type * as wechat from "../wechat.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  banners: typeof banners;
  http: typeof http;
  init: typeof init;
  manager: typeof manager;
  menus: typeof menus;
  registration: typeof registration;
  telbook: typeof telbook;
  wechat: typeof wechat;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
