// pages/login/login.js
const { post } = require('../../utils/request');

Page({
  data: {
    isCheckingAuth: true,
    phoneNumber: '',
    userName: ''  // 新增姓名字段
  },

  onLoad() {
    const token = wx.getStorageSync('token');
    if (token) {
      wx.showLoading({ title: '自动登录中...' });
    } else {
      this.setData({ isCheckingAuth: false });
    }
  },

  // 手机号输入
  handlePhoneInput(e) {
    this.setData({ phoneNumber: e.detail.value });
  },

  // 姓名输入
  handleNameInput(e) {
    this.setData({ userName: e.detail.value });
  },

  handleSubmit() {
    const phone = this.data.phoneNumber;
    const name = this.data.userName.trim();

    // 表单验证
    if (!phone || phone.length !== 11) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' });
      return;
    }

    if (!name) {
      wx.showToast({ title: '请输入真实姓名', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '验证中...' });

    wx.login({
      success: (res) => {
        if (res.code) {
          this.performLogin(res.code, phone, name);
        } else {
          wx.hideLoading();
          wx.showToast({ title: '微信授权失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '无法连接微信', icon: 'none' });
      }
    });
  },

  performLogin(code, phone, name) {
    post('/wx/manual-login', { code, phoneNumber: phone, name })
      .then(res => {
        wx.hideLoading();
        if (res.success) {
          wx.setStorageSync('token', res.token);
          wx.reLaunch({ url: '/pages/home/home' });
        } else {
          wx.showModal({
            title: '登录失败',
            content: res.message || '请确认手机号和姓名是否正确',
            showCancel: false
          });
        }
      })
      .catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '网络请求错误', icon: 'none' });
      });
  },

  // 跳转到注册页面
  goToRegister() {
    wx.navigateTo({ url: '/pages/register/register' });
  }
});
