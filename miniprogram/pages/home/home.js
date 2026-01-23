// pages/home/home.js
const app = getApp();
const { get, post } = require('../../utils/request');

Page({
  data: {
    userInfo: null,
    loading: true,
    swiperArr: [],
    // 本地备份banner（网络获取失败时使用）
    localBanners: [
      "/images/banner/banner1.png"
    ],
    myToolArr: [],
  },

  onLoad: function () {
    this.fetchBanners();
    this.fetchMenus();
  },

  onShow: function () {
    this.fetchUserProfile();
  },

  // 从接口获取Banner轮播图
  fetchBanners: function () {
    get('/wx/banners')
      .then(res => {
        if (res.success && res.banners && res.banners.length > 0) {
          this.setData({ swiperArr: res.banners });
        } else {
          // 使用本地备份
          this.setData({ swiperArr: this.data.localBanners });
        }
      })
      .catch(() => {
        // 网络错误，使用本地备份
        this.setData({ swiperArr: this.data.localBanners });
      });
  },

  // 从接口获取用户菜单
  fetchMenus: function () {
    get('/wx/menus', { auth: true })
      .then(res => {
        if (res.success && res.menus && res.menus.length > 0) {
          this.setData({ myToolArr: res.menus });
        } else {
          // 接口获取失败，使用本地备份
          this.initLocalTools();
        }
      })
      .catch(() => {
        // 网络错误，使用本地备份
        this.initLocalTools();
      });
  },

  // 使用本地工具菜单作为降级方案
  initLocalTools: function () {
    const toolArr = app.globalData.toolArr;
    if (toolArr && toolArr.length > 0) {
      this.setData({ myToolArr: toolArr });
    }
  },

  // 获取用户资料
  fetchUserProfile: function () {
    const token = wx.getStorageSync('token');

    if (!token) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }

    get('/wx/profile', { auth: true })
      .then(res => {
        if (res.success) {
          this.setData({
            userInfo: res.data,
            loading: false
          });
        }
      })
      .catch(err => {
        console.error("请求失败", err);
        this.setData({ loading: false });
      });
  },

  // 退出登录
  handleLogout: function () {
    wx.showModal({
      title: '提示',
      content: '确定退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('token');
          wx.reLaunch({ url: '/pages/login/login' });
        }
      }
    });
  },



  // 小工具页面跳转
  goTool: function (e) {
    const currentId = e.currentTarget.id;
    const currentTool = this.data.myToolArr.find(t => t._id == currentId);

    if (!currentTool) return;

    if (currentTool.type === "miniprogram") {
      wx.navigateToMiniProgram({ appId: currentTool.page });
    } else {
      wx.navigateTo({ url: currentTool.page });
    }
  }
});
