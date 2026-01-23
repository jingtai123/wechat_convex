/**
 * 统一请求封装
 */

/**
 * 获取 API 基础地址
 * @returns {string} API 基础地址
 */
const getBaseUrl = () => {
  const app = getApp();
  return app.globalData.apiBaseUrl;
};

/**
 * 封装的请求方法
 * @param {Object} options 请求配置
 * @param {string} options.url - 请求路径（不含baseUrl）
 * @param {string} [options.method='GET'] - 请求方法
 * @param {Object} [options.data] - 请求数据
 * @param {boolean} [options.auth=false] - 是否需要认证
 * @param {boolean} [options.showLoading=false] - 是否显示loading
 * @param {string} [options.loadingText='加载中...'] - loading文字
 * @returns {Promise}
 */
function request(options) {
  const {
    url,
    method = 'GET',
    data = {},
    auth = false,
    showLoading = false,
    loadingText = '加载中...'
  } = options;

  return new Promise((resolve, reject) => {
    // 显示 loading
    if (showLoading) {
      wx.showLoading({ title: loadingText, mask: true });
    }

    // 构建 header
    const header = {
      'Content-Type': 'application/json'
    };

    // 需要认证时添加 token
    if (auth) {
      const token = wx.getStorageSync('token');
      if (token) {
        header['Authorization'] = token;
      }
    }

    const BASE_URL = getBaseUrl();
    wx.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header,
      success: (res) => {
        if (showLoading) wx.hideLoading();

        // 处理 401 未授权
        if (res.statusCode === 401) {
          wx.removeStorageSync('token');
          wx.showToast({ title: '登录已过期', icon: 'none' });
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/login/login' });
          }, 1500);
          reject({ code: 401, message: '未授权' });
          return;
        }

        // 请求成功
        resolve(res.data);
      },
      fail: (err) => {
        if (showLoading) wx.hideLoading();
        wx.showToast({ title: '网络连接失败', icon: 'none' });
        reject(err);
      }
    });
  });
}

/**
 * GET 请求
 */
function get(url, options = {}) {
  return request({ url, method: 'GET', ...options });
}

/**
 * POST 请求
 */
function post(url, data = {}, options = {}) {
  return request({ url, method: 'POST', data, ...options });
}

module.exports = {
  request,
  get,
  post
};
