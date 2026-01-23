Component({
  properties: {
    swiperArr: {
      type: Array,
      value: []
    }

  },
  data: {
    interval: 2000,
    duration: 500,
    activeNum: 0
  },
  methods: {
    swiperChange(e) {
      // console.log(e.detail.current)
      let current = e.detail.current
      this.setData({
        activeNum: current
      })
    },
  }


})