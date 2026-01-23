// app.js
const config = require('./config');

App({
  onLaunch() {
    this.checkAutoLogin();
  },
  checkAutoLogin() {
    const token = wx.getStorageSync('token');

    // 如果本地没有 token，说明没登录过，什么都不做，停留在登录页
    if (!token) return;

    // 静默检测
    wx.request({
      url: `${this.globalData.apiBaseUrl}/wx/check-auth`,
      method: 'POST',
      data: { token: token },
      success: (res) => {
        wx.hideLoading();
        if (res.data.ok) {
          console.log('自动登录成功，跳转首页');
          wx.reLaunch({ url: '/pages/home/home' });
        } else {
          console.log('Token 过期或无效');
          wx.removeStorageSync('token');
          this.notifyLoginPage();
        }
      },
      fail: () => {
        wx.hideLoading();
        this.notifyLoginPage();
      }
    });
  },
  // 通知登录页显示表单
  notifyLoginPage() {
    const pages = getCurrentPages();
    const loginPage = pages.find(p => p.route === 'pages/login/login');
    if (loginPage) {
      loginPage.setData({ isCheckingAuth: false });
    }
  },
  globalData: {
    // API 基础地址 (从 config.js 读取)
    apiBaseUrl: config.apiBaseUrl,

    toolArr: []
  }
})