// pages/register/register.js
const { post } = require('../../utils/request');

Page({
  data: {
    phoneNumber: '',
    userName: '',
    department: '',
    submitting: false
  },

  handlePhoneInput(e) {
    this.setData({ phoneNumber: e.detail.value });
  },

  handleNameInput(e) {
    this.setData({ userName: e.detail.value });
  },

  handleDepartmentInput(e) {
    this.setData({ department: e.detail.value });
  },

  handleSubmit() {
    const { phoneNumber, userName, department } = this.data;

    // 表单验证
    if (!phoneNumber || phoneNumber.length !== 11) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' });
      return;
    }

    if (!userName.trim()) {
      wx.showToast({ title: '请输入真实姓名', icon: 'none' });
      return;
    }

    if (!department.trim()) {
      wx.showToast({ title: '请输入所属科室', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    post('/wx/register', {
      phoneNumber,
      name: userName.trim(),
      department: department.trim()
    })
      .then(res => {
        this.setData({ submitting: false });
        if (res.success) {
          wx.showModal({
            title: '提交成功',
            content: res.message || '注册申请已提交，请等待管理员审核',
            showCancel: false,
            success: () => {
              wx.navigateBack();
            }
          });
        } else {
          wx.showModal({
            title: '提交失败',
            content: res.message || '请稍后重试',
            showCancel: false
          });
        }
      })
      .catch(() => {
        this.setData({ submitting: false });
        wx.showToast({ title: '网络请求错误', icon: 'none' });
      });
  },

  goBack() {
    wx.navigateBack();
  }
});
