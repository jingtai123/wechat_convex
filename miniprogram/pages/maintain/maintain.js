// pages/maintain/maintain.js
const { get, post } = require('../../utils/request');

Page({
  data: {
    activeTab: 'telbook',
    tabs: [
      { id: 'telbook', name: '电话簿' }
    ],

    // Lists
    telbooks: [],

    // Search
    telbookSearch: '',

    // Modals & Form Data
    showTelbookModal: false,

    isEdit: false,
    formData: {}, // Shared form data object
  },

  onLoad(options) {
    this.fetchData();
  },

  onPullDownRefresh() {
    this.fetchData(() => wx.stopPullDownRefresh());
  },

  switchTab(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ activeTab: id });
    // Single tab, no need to switch logic really, but kept for future structure
    this.fetchData();
  },

  fetchData(cb) {
    const tab = this.data.activeTab;
    if (tab === 'telbook') this.fetchTelbooks(cb);
    else if (cb) cb();
  },

  // ==================== TELBOOK ====================
  fetchTelbooks(cb) {
    get('/wx/manager/telbook', { auth: true }).then(res => {
      if (res.success) this.setData({ telbooks: res.data });
      if (cb) cb();
    });
  },

  onSearchInput(e) {
    this.setData({ telbookSearch: e.detail.value });
  },

  onSearchTelbook() {
    const val = this.data.telbookSearch;
    if (!val) {
      this.fetchTelbooks();
      return;
    }
    const filtered = this.data.telbooks.filter(t => t.name.includes(val) || t.remark.includes(val));
    this.setData({ telbooks: filtered });
  },

  openTelbookAdd() {
    this.setData({
      isEdit: false,
      showTelbookModal: true,
      formData: {}
    });
  },

  openTelbookEdit(e) {
    const item = e.currentTarget.dataset.item;
    this.setData({
      isEdit: true,
      showTelbookModal: true,
      formData: { ...item }
    });
  },

  submitTelbook() {
    const d = this.data.formData;

    if (!d.name) {
      wx.showToast({ title: '请输入部门/名称', icon: 'none' });
      return;
    }

    const url = this.data.isEdit ? '/wx/manager/telbook/update' : '/wx/manager/telbook/create';

    // Explicitly pick fields
    const payload = {
      name: d.name,
      remark: d.remark || '',
      outPhone: d.outPhone || '',
      inPhone: d.inPhone || ''
    };

    if (this.data.isEdit) {
      payload.id = d._id;
    }

    post(url, payload, { auth: true }).then(res => {
      if (res.success) {
        wx.showToast({ title: '保存成功' });
        this.setData({ showTelbookModal: false });
        this.fetchTelbooks();
      }
    });
  },

  deleteTelbook(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定删除该条目吗？',
      success: (res) => {
        if (res.confirm) {
          post('/wx/manager/telbook/delete', { id }, { auth: true }).then(r => {
            if (r.success) {
              wx.showToast({ title: '已删除' });
              this.fetchTelbooks();
            }
          });
        }
      }
    });
  },

  // Common Form Handlers
  handleInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  closeAllModals() {
    this.setData({
      showTelbookModal: false
    });
  },

  handleSwitch(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`formData.${field}`]: value
    });
  }
});