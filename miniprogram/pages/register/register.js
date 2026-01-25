// pages/register/register.js
const { post } = require('../../utils/request');

// 适配微信小程序的医院职工办公应用 - 用户服务协议
const USER_AGREEMENT = `<div class="agreement-content">
  <div class="agreement-paragraph">欢迎使用本小程序。本服务仅面向在职职工开放。请您仔细阅读并理解本协议全部条款，点击“同意”即表示您已充分阅读、理解并同意接受本协议的约束。</div>
  
  <div class="agreement-section-title">一、服务范围与使用条件</div>
  <div class="agreement-paragraph">1. 本小程序仅限在职职工注册及使用，离职、退休人员将被收回使用权限。</div>
  <div class="agreement-paragraph">2. 核心服务功能包括：内部通讯录查询等（本院有权根据业务需求调整服务内容）。</div>
  <div class="agreement-paragraph">3. 您需保证注册时提供的姓名、科室、手机号等信息真实、准确、完整，不得冒用他人身份信息。</div>
  
  <div class="agreement-section-title">二、账号安全与管理</div>
  <div class="agreement-paragraph">1. 您需妥善保管账号及相关登录凭证。</div>
  <div class="agreement-paragraph">2. 岗位变动、离职时，将收回账号使用权限。</div>
  
  <div class="agreement-section-title">三、用户行为规范</div>
  <div class="agreement-paragraph">1. 不得利用本服务从事任何违反法律法规的活动，不得干扰服务正常运行（如恶意攻击、刷量、传播非法信息等）。</div>
  <div class="agreement-paragraph">2. 严禁未经授权批量采集、存储、传播信息，不得用于办公以外的任何用途。</div>
  <div class="agreement-paragraph">3. 违反上述规范的，有权暂停或终止您的账号使用权限，情节严重的将移交相关执法部门处理。</div>
  
  <div class="agreement-section-title">四、责任限制</div>
  <div class="agreement-paragraph">1. 因不可抗力（包括但不限于网络故障、通讯中断、自然灾害、政策调整）导致服务暂时中断的，不承担违约责任。</div>
  <div class="agreement-paragraph">2. 仅对小程序本身的正常运行负责，不对您通过本服务开展的工作行为及结果承担连带责任。</div>
  
  <div class="agreement-section-title">五、协议变更与终止</div>
  <div class="agreement-paragraph">1. 有权根据法律法规更新或业务调整修订本协议，修订后的协议将在小程序内公示，公示后继续使用服务即视为同意修订后的条款。</div>
  <div class="agreement-paragraph">2. 有权在您违反本协议、离职等情况下终止服务，终止后您的账号数据将按隐私政策约定处理。</div>
  
  <div class="agreement-section-title">六、争议解决</div>
  <div class="agreement-paragraph">因本协议产生的争议，双方应友好协商解决。</div>
</div>`;

// 适配微信小程序的医院职工办公应用 - 隐私政策
const PRIVACY_POLICY = `<div class="agreement-content">
  <div class="agreement-paragraph">本小程序高度重视您的个人信息保护，遵循《中华人民共和国个人信息保护法》《中华人民共和国网络安全法》等法律法规，制定本隐私政策。使用本小程序即表示您同意按照本政策收集、使用、存储和保护您的个人信息。</div>
  
  <div class="agreement-section-title">一、个人信息收集范围与目的</div>
  <div class="agreement-paragraph">本小程序仅收集为提供办公服务所必需的信息，收集范围如下：</div>
  <div class="agreement-paragraph"><strong>1. 手机号码：</strong>用于账号唯一标识、身份验证及工作紧急联系，不用于其他商业用途。</div>
  <div class="agreement-paragraph"><strong>2. 真实姓名：</strong>用于核实职工身份，仅在小程序内部显示，不对外公开。</div>
  <div class="agreement-paragraph"><strong>3. 所属科室：</strong>用于组织架构归属、权限分配及科室协同办公，不向非职工展示。</div>
  <div class="agreement-paragraph"><strong>补充说明：</strong>本小程序不会强制收集非必要信息，您可拒绝提供非必要信息，但可能影响部分办公功能的使用。</div>
  
  <div class="agreement-section-title">二、个人信息使用规则</div>
  <div class="agreement-paragraph">1. 仅用于办公服务，包括身份验证、权限管理、工作通知推送、通讯录展示等。</div>
  <div class="agreement-paragraph">2. 未经您明确同意，本小程序不会将您的个人信息用于本政策约定以外的用途。</div>
  
  <div class="agreement-section-title">三、信息存储与保护</div>
  <div class="agreement-paragraph">1. 存储方式：您的信息存储在指定的安全服务器中，采用加密传输、访问权限分级管控等技术措施保护数据安全。</div>
  <div class="agreement-paragraph">2. 存储期限：在您在职期间持续存储，离职后将在【15个工作日】内删除或匿名化处理您的个人信息（法律法规另有要求的除外）。</div>
  <div class="agreement-paragraph">3. 第三方共享：本小程序不会出售、出租您的个人信息；仅在法律法规要求、配合执法部门调查等法定情形下，才会向第三方提供必要信息。</div>
  
  <div class="agreement-section-title">四、您的权利与操作方式</div>
  <div class="agreement-paragraph">1. 查询与更正：您可在小程序“首页”查询注册信息，信息有误可联系管理员提交更正申请。</div>
  <div class="agreement-paragraph">2. 撤回同意与注销：您可随时联系管理员撤回信息使用同意，或申请注销账号；注销后本院将按约定删除您的个人信息。</div>
  <div class="agreement-paragraph">3. 投诉反馈：如发现信息泄露、滥用等问题，可向管理员投诉。</div>
  
  <div class="agreement-section-title">五、政策变更</div>
  <div class="agreement-paragraph">本小程序可根据法律法规更新修订本政策，修订后继续使用服务即视为同意修订后的政策。</div>
</div>`;

Page({
  data: {
    phoneNumber: '',
    userName: '',
    department: '',
    submitting: false,
    agreedToTerms: false,
    showAgreement: false,
    currentAgreementTitle: '',
    currentAgreementContent: ''
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

  toggleAgreement() {
    this.setData({ agreedToTerms: !this.data.agreedToTerms });
  },

  viewUserAgreement() {
    this.setData({
      showAgreement: true,
      currentAgreementTitle: '用户服务协议',
      currentAgreementContent: USER_AGREEMENT
    });
  },

  viewPrivacyPolicy() {
    this.setData({
      showAgreement: true,
      currentAgreementTitle: '隐私政策',
      currentAgreementContent: PRIVACY_POLICY
    });
  },

  closeAgreementModal() {
    this.setData({ showAgreement: false });
  },

  stopProp() {
    // Prevent modal close when clicking on content
  },

  handleSubmit() {
    const { phoneNumber, userName, department, agreedToTerms } = this.data;

    // 协议同意验证
    if (!agreedToTerms) {
      wx.showToast({ title: '请先阅读并同意用户协议', icon: 'none' });
      return;
    }

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
