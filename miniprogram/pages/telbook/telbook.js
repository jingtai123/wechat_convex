// pages/telbook/telbook.js
const { get } = require('../../utils/request')

Page({
  data: {
    phoneList: [],
    allList: [],
    inputValue: '',
    scrollTop: 0
  },

  onLoad: function (options) {
    this.fetchTelbook()
  },

  // 从接口获取电话簿数据
  fetchTelbook: function () {
    wx.showLoading({ title: '加载数据...' })

    get('/wx/telbook', { auth: true })
      .then(res => {
        wx.hideLoading()
        if (res.success && res.data && res.data.length > 0) {
          this.setData({
            phoneList: res.data,
            allList: res.data,
          })
        } else {
          wx.showToast({ title: '暂无数据', icon: 'none' })
        }
      })
      .catch(err => {
        wx.hideLoading()
        console.error('获取电话簿失败:', err)
        wx.showToast({ title: '加载失败', icon: 'error' })
      })
  },


  inputHandle: function (e) {
    //this.searchPhone(e.detail.value)
    var inputValue = e.detail.value
    //console.log(this.data.allList)
    var tempList = this.data.allList.filter(function (item) {
      if (item.NAME.toString().includes(inputValue) || item.REMARK.toString().includes(inputValue) || item.INPHONE.toString().includes(inputValue) || item.OUTPHONE.toString().includes(inputValue))
        return item
    })
    this.setData({
      phoneList: tempList,
      scrollTop:0
    })

  },

  makePhoneCall: function (event) {
    // console.log(event)
    let phoneNumber = event.currentTarget.id
    if (phoneNumber) {
      wx.makePhoneCall({
        phoneNumber: phoneNumber,
        success: (res) => {},
        fail: (res) => {},
        complete: (res) => {},
      })
    }
  },


  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  }
})