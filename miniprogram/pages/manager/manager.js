// pages/manager/manager.js
const { get, post } = require('../../utils/request');

Page({
  data: {
    activeTab: 'users',
    tabs: [
      { id: 'users', name: '用户管理' },
      { id: 'audit', name: '审核' },
      { id: 'menus', name: '菜单' },
      { id: 'roles', name: '角色' }
    ],

    // Lists
    users: [],
    pendingUsers: [],
    menus: [],
    roles: [],

    // Search
    userSearch: '',

    // Modals & Form Data
    showUserModal: false,
    showMenuModal: false,
    showRoleModal: false,

    isEdit: false,

    formData: {}, // Shared form data object

    // Menu Type Options
    typeOptions: ['page', 'miniprogram'],
    typeIndex: 0
  },

  onLoad(options) {
    this.fetchData();
  },

  onPullDownRefresh() {
    this.fetchData(() => wx.stopPullDownRefresh());
  },

  switchTab(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ activeTab: id }, () => {
      this.fetchData();
    });
  },

  fetchData(cb) {
    const tab = this.data.activeTab;
    if (tab === 'users') this.fetchUsers(cb);
    else if (tab === 'audit') this.fetchPendingUsers(cb);
    else if (tab === 'menus') this.fetchMenus(cb);
    else if (tab === 'roles') this.fetchRoles(cb);
    else if (cb) cb();
  },


  // ==================== USERS ====================
  fetchUsers(cb) {
    // Also fetch roles to map roleId to roleName
    Promise.all([
      get('/wx/manager/users', { auth: true }),
      get('/wx/manager/roles', { auth: true }) // Reuse existing roles endpoint
    ]).then(([resUsers, resRoles]) => {
      if (resUsers.success && resRoles.success) {
        const rolesMap = {};
        resRoles.data.forEach(r => {
          rolesMap[r.roleId] = r.name;
        });

        const users = resUsers.data.map(u => ({
          ...u,
          roleName: rolesMap[u.roleId] || '未知角色'
        }));

        this.setData({ users, roles: resRoles.data }); // Update roles too just in case
      }
      if (cb) cb();
    });
  },

  onSearchUserInput(e) {
    this.setData({ userSearch: e.detail.value });
  },

  onSearchUser() {
    const val = this.data.userSearch;
    if (!val) {
      this.fetchUsers();
      return;
    }
    const filtered = this.data.users.filter(u =>
      (u.name && u.name.includes(val)) ||
      (u.department && u.department.includes(val)) ||
      (u.phoneNumber && u.phoneNumber.includes(val)) ||
      (u.roleName && u.roleName.includes(val))
    );
    this.setData({ users: filtered });
  },

  openUserEdit(e) {
    const item = e.currentTarget.dataset.item;
    this.setData({
      isEdit: true,
      showUserModal: true,
      formData: { ...item }
    });
  },

  // Submit User (only Update supported for now)
  submitUser() {
    const { _id, name, department, roleId } = this.data.formData;
    post('/wx/manager/users/update', {
      id: _id,
      name,
      department,
      roleId: Number(roleId)
    }, { auth: true }).then(res => {
      if (res.success) {
        wx.showToast({ title: '保存成功' });
        this.setData({ showUserModal: false });
        this.fetchUsers();
      }
    });
  },

  deleteUser(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '此操作不可恢复，确定要删除该用户吗？',
      success: (res) => {
        if (res.confirm) {
          post('/wx/manager/users/delete', { id }, { auth: true }).then(r => {
            if (r.success) {
              wx.showToast({ title: '已删除' });
              this.fetchUsers();
            }
          });
        }
      }
    });
  },

  // ==================== PENDING ====================
  fetchPendingUsers(cb) {
    get('/wx/manager/pending-users', { auth: true }).then(res => {
      if (res.success) {
        const list = res.data.map(item => ({
          ...item,
          createdAtStr: new Date(item.createdAt).toLocaleString()
        }));
        this.setData({ pendingUsers: list });
      }
      if (cb) cb();
    });
  },

  approveUser(e) {
    const id = e.currentTarget.dataset.id;
    wx.showLoading({ title: '处理中' });
    post('/wx/manager/pending-users/approve', { id }, { auth: true }).then(res => {
      wx.hideLoading();
      if (res.success) {
        wx.showToast({ title: '审核通过' });
        this.fetchPendingUsers();
      }
    });
  },

  rejectUser(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '拒绝申请',
      editable: true,
      placeholderText: '请输入拒绝理由',
      success: (res) => {
        if (res.confirm) {
          post('/wx/manager/pending-users/reject', {
            id,
            reason: res.content || '未填写理由'
          }, { auth: true }).then(r => {
            if (r.success) {
              wx.showToast({ title: '已拒绝' });
              this.fetchPendingUsers();
            }
          });
        }
      }
    });
  },

  // ==================== MENUS ====================
  fetchMenus(cb) {
    get('/wx/manager/menus', { auth: true }).then(res => {
      if (res.success) this.setData({ menus: res.data });
      if (cb) cb();
    });
  },

  openMenuAdd() {
    this.setData({
      isEdit: false,
      showMenuModal: true,
      typeIndex: 0,
      formData: { isActive: true, sortOrder: 0, type: 'page' }
    });
  },

  openMenuEdit(e) {
    const item = e.currentTarget.dataset.item;
    const typeIdx = this.data.typeOptions.indexOf(item.type || 'page');
    this.setData({
      isEdit: true,
      showMenuModal: true,
      typeIndex: typeIdx > -1 ? typeIdx : 0,
      formData: { ...item }
    });
  },

  handleTypeChange(e) {
    const idx = Number(e.detail.value);
    this.setData({
      typeIndex: idx,
      'formData.type': this.data.typeOptions[idx]
    });
  },

  submitMenu() {
    const d = this.data.formData;

    if (!d.name) {
      wx.showToast({ title: '请输入菜单名称', icon: 'none' });
      return;
    }
    // Only validate menuId if editing
    if (this.data.isEdit && (d.menuId === undefined || d.menuId === '')) {
      wx.showToast({ title: '请输入菜单ID', icon: 'none' });
      return;
    }
    if (!d.page) {
      wx.showToast({ title: '请输入页面路径', icon: 'none' });
      return;
    }

    const url = this.data.isEdit ? '/wx/manager/menus/update' : '/wx/manager/menus/create';

    const payload = {
      name: d.name,
      icon: d.icon,
      page: d.page,
      sortOrder: Number(d.sortOrder),
      isActive: !!d.isActive,
      type: d.type || 'page'
    };

    // Pass menuId only on Update. Create generates it.
    if (this.data.isEdit) {
      payload.id = d._id;
      payload.menuId = Number(d.menuId);
    }

    post(url, payload, { auth: true }).then(res => {
      if (res.success) {
        wx.showToast({ title: '保存成功' });
        this.setData({ showMenuModal: false });
        this.fetchMenus();
      }
    });
  },

  deleteMenu(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定删除该菜单吗？',
      success: (res) => {
        if (res.confirm) {
          post('/wx/manager/menus/delete', { id }, { auth: true }).then(r => {
            if (r.success) {
              wx.showToast({ title: '已删除' });
              this.fetchMenus();
            }
          });
        }
      }
    });
  },

  // ==================== ROLES ====================
  fetchRoles(cb) {
    get('/wx/manager/roles', { auth: true }).then(res => {
      if (res.success) this.setData({ roles: res.data });
      if (cb) cb();
    });
  },

  openRoleAdd() {
    this.fetchMenus(); // ensure menus are loaded for selection
    this.setData({
      isEdit: false,
      showRoleModal: true,
      formData: { menuIds: [] }
    });
  },

  openRoleEdit(e) {
    const item = e.currentTarget.dataset.item;
    this.fetchMenus(); // ensure menus are loaded for selection
    this.setData({
      isEdit: true,
      showRoleModal: true,
      formData: { ...item }
    });
  },

  handleRoleMenuChange(e) {
    const values = e.detail.value;
    const menuIds = values.map(v => Number(v));
    this.setData({
      'formData.menuIds': menuIds
    });
  },

  submitRole() {
    const d = this.data.formData;

    if (!d.name) {
      wx.showToast({ title: '请输入角色名称', icon: 'none' });
      return;
    }
    // Only validate roleId if editing
    if (this.data.isEdit && (d.roleId === undefined || d.roleId === '')) {
      wx.showToast({ title: '请输入角色ID', icon: 'none' });
      return;
    }

    const url = this.data.isEdit ? '/wx/manager/roles/update' : '/wx/manager/roles/create';

    const payload = {
      name: d.name,
      description: d.description || '',
      menuIds: d.menuIds || [],
      isDefault: !!d.isDefault
    };

    // Pass roleId only on Update. Create generates it.
    if (this.data.isEdit) {
      payload.id = d._id;
      payload.roleId = Number(d.roleId);
    }

    post(url, payload, { auth: true }).then(res => {
      if (res.success) {
        wx.showToast({ title: '保存成功' });
        this.setData({ showRoleModal: false });
        this.fetchRoles();
      }
    });
  },

  deleteRole(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定删除该角色吗？',
      success: (res) => {
        if (res.confirm) {
          post('/wx/manager/roles/delete', { id }, { auth: true }).then(r => {
            if (r.success) {
              wx.showToast({ title: '已删除' });
              this.fetchRoles();
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
      showUserModal: false,
      showMenuModal: false,
      showRoleModal: false,
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