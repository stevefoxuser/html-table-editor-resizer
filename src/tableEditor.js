// config
const conf = {
  language: 'cn', // cn en
  cursorWidth: 3,
  minWidth: 20,
  minHeight: 20
}
const d = document
const $ = function (str, findIn) {
  return str[0] === '#' ? (findIn || d).querySelector(str) : (findIn || d).querySelectorAll(str)
}
const getPos = function (el, prop) {
  let result = el[prop]
  while (el.offsetParent && el.tagName !== 'body') {
    el = el.offsetParent
    result += el[prop]
  }
  return result
}
const isParent = function (el, checkp) {
  let result = el === checkp
  while (el.parentNode && el.parentNode.tagName !== 'body') {
    el = el.parentNode
    if (el === checkp) {
      result = true
    }
  }
  return result
}
const getPageX = function (el) {
  return getPos(el, 'offsetLeft')
}
const getPageY = function (el) {
  return getPos(el, 'offsetTop')
}
const hasClass = function (el, className) {
  return el.className ? el.className.split(/\s+/g).includes(className) : false
}
const addClass = function (el, className) {
  if (hasClass(el, className)) return
  el.className = el.className + ' ' + className
}
const removeClass = function (el, className) {
  if (!el.className) return
  let newClassName = el.className.replace(className, '')
  newClassName = newClassName.replace(/^\s+/, '').replace(/\s+$/, '')
  el.className = newClassName.split(/\s+/g).join(' ')
  if (/\s+/.test(el.className) || !el.className) {
    el.removeAttribute('class')
  }
}
const getIndex = function (el) {
  let index = null
  const tg = el.tagName.toLowerCase()
  $(tg, el.parentNode).forEach((_e, k) => {
    if (_e === el) {
      index = k
    }
  })
  return index
}
const insertAfter = function (newNode, existingNode) {
  const parent = existingNode.parentNode;
  if (parent.lastChild === existingNode) {
    parent.appendChild(newNode);
  } else {
    parent.insertBefore(newNode, existingNode.nextSibling);
  }
}
const checkIfOutOfScreen = function (popoverEl, top) {
  if (top + popoverEl.offsetHeight > d.documentElement.clientHeight) {
    popoverEl.style.top = d.documentElement.clientHeight - popoverEl.offsetHeight + 'px'
  }
}
const getRowSpan = function (el) {
  return el.getAttribute('rowspan') ? parseInt(el.getAttribute('rowspan')) : 1
}
const getColSpan = function (el) {
  return el.getAttribute('colspan') ? parseInt(el.getAttribute('colspan')) : 1
}

class TableEditor {
  constructor () {
    this.el = null
    this.pNode = null
    this.action = null
    this.actd = null
    this.selectDirection = null
    this.menuState = 'hidden'
    this.ms = 'up'
    this.startY = null
    this.startHeight = null
    this.startX = null
    this.startWidth = null
    this.readonly = false

    // 拖动光标生效范围必须比td最小宽度要小，否则会产生很多额外的逻辑判断当前拖动的是哪一个td，没有实用价值
    if (conf.cursorWidth >= conf.minWidth) conf.minWidth = conf.cursorWidth + 1
    if (conf.cursorWidth >= conf.minHeight) conf.minHeight = conf.cursorWidth + 1
    // 表格默认的样式，所有实例只创建一个样式标签
    if (!$('#table_editor_global')) {
      const style = d.createElement('style')
      style.setAttribute('id', 'table_editor_global')
      style.setAttribute('type', 'text/css')
      style.innerHTML = `
        #new_context_menu{
          position:absolute;
          z-index:999999999;
        }
        #new_context_menu ul{
          list-style-type:none;
          margin:0;
          padding:0;
          border-top:1px solid #ccc;
          border-right:1px solid #ccc;
        }
        #new_context_menu ul li{
          background:#fff;
          padding:10px;
          border-bottom:1px solid #ccc;
          border-left:1px solid #ccc;
          cursor:pointer;
          clear:both;
          overflow:hidden;
        }
        #new_context_menu ul li:hover{
          background:#eee;
        }
        #new_context_menu ul li.disabled{
          color:#999;
          cursor:default;
          background:#fff;
        }
        #new_context_menu ul li.disabled:hover{
          color:#999;
          cursor:default;
          background:#fff;
        }
        .namespace_table_editor td{
          vertical-align:top;
          padding:0;
        }
        .namespace_table_editor .selected{
          background:#ccc;
        }
       
        #namespace_style_ul{
          width:210px;
        }
        .namespace_left_div{
          width:100px;
          float:left;
        }
        .namespace_right_div input,.namespace_right_div select{
          color:#333;
        }
        .namespace_right_div{
          width:80px;
          float:left;
        }
        .namespace_right_div input{
          width:40px;
        }
      `
      d.body.appendChild(style)
    }
    this.menuList = {
      cn: {
        insertRowAfter: '在下方插入行',
        insertColumnAfter: '在右方插入列',
        deleteRow: '删除行',
        deleteColumn: '删除列',
        mergeCells: '合并单元格',
        splitCell: '拆分单元格',
        cellStyle: '单元格样式'
        // configData: '绑定数据'
      },
      en: {
        insertRowAfter: 'insert row after',
        insertColumnAfter: 'insert column after',
        deleteRow: 'delete selected row',
        deleteColumn: 'delete selected column',
        mergeCells: 'merge cells',
        splitCell: 'split cell',
        cellStyle: 'edit cell style'
        // configData: 'config data'
      }
    }[conf.language || 'cn']

    this.styleList = {
      cn: {
        verticalAlign: '垂直对齐',
        textAlign: '水平对齐',
        fontSize: '字体大小',
        lineHeight: '行高',
        height: '高度',
        width: '宽度',
        paddingTop: '上边距',
        paddingRight: '右边距',
        paddingBottom: '下边距',
        paddingLeft: '左边距',
      },
      en: {
        verticalAlign: 'vertical align',
        textAlign: 'text align',
        fontSize: 'font size',
        lineHeight: 'line height',
        height: 'height',
        width: 'width',
        paddingTop: 'padding top',
        paddingRight: 'padding right',
        paddingBottom: 'padding bottom',
        paddingLeft: 'padding left',
      }
    }[conf.language || 'cn']
  }
  Create (rows, columns, appendTo) {
    let tableStr = []
    for (let i = 0; i < rows; i++) {
      let _tmp = '<tr>'
      for (let j = 0; j < columns; j++) {
        _tmp += `<td style="padding:0;font-size:12px;line-height:14px;width: ${conf.minWidth}px;height:${conf.minHeight}px;"></td>`
      }
      _tmp += '</tr>'
      tableStr.push(_tmp)
    }
    // const id = this.newId()
    let result = `<table border="1" class="namespace_table_editor">${tableStr.join('')}</table>`
    if (appendTo) {
      appendTo.innerHTML = result
      this.initTable($('table', appendTo)[0])
    }
    return result
  }
  CreateFromString (str, appendTo) {
    appendTo.innerHTML = str
    this.initTable($('table', appendTo)[0])
  }
  CreateFromElem (elem) {
    this.pNode = elem.parentNode
    this.initTable(elem)
  }
  initTable (elem) {
    this.el = elem
    addClass(this.el, 'namespace_table_editor')
    this.el.ondragstart = function () {
      return false
    }
    this.el.style.borderCollapse = 'collapse'
    this.el.style.wordBreak = 'break-all'
    // if (styleMap) {
    //   Object.keys(styleMap).forEach(k => {
    //     this.el.style[k] = styleMap[k]
    //   })
    // }
    if (!this.readonly) this.el.setAttribute('contenteditable', true)
    this.bindEvents()
  }
  setReadOnly () {
    this.readonly = true
    this.el.style.cursor = 'default'
    this.el.setAttribute('contenteditable', false)
  }
  setWriteAble () {
    this.readonly = false
    this.el.setAttribute('contenteditable', true)
  }
  GetTableStr () {
    // if (directly) {
    //   return this.el.parentNode.innerHTML
    // } else {
    const elem = this.el.cloneNode(true)
    elem.style.cursor = 'default'
    // elem.setAttribute('contenteditable', false)
    let div = d.createElement('div')
    div.appendChild(elem)
    setTimeout(() => {
      div = null
    })
    return div.innerHTML
    // }
  }
  GetTable () {
    const elem = this.el.cloneNode(true)
    elem.style.cursor = 'default'
    // elem.setAttribute('contenteditable', false)
    return elem
  }
  /* 
    set your own rule to require data
    sample : dataSourceListStr = [{
      name : "getBookList" ,
      method : "GET",
      source : "http://127.0.0.1",
      params: "keyword,offset,pagesize"
    }]
  */
  // bindData (dataSourceListStr) {
  //   this.el.setAttribute('data-source', dataSourceListStr)
  // }
  // getDataSource () {
  //   return this.el.getAttribute('data-source')
  // }
  cellFilter (x, y) {
    const result = []
    if (typeof x !== 'function') {
      if (x === -1) x = [-Infinity, Infinity]
      if (y === -1) y = [-Infinity, Infinity]
      if (typeof x === 'number') x = [x, x]
      if (typeof y === 'number') y = [y, y]
      if (x[0] > x[1]) x.reverse()
      if (y[0] > y[1]) y.reverse()
      $('td', this.el).forEach(td => {
        if (td.offsetLeft >= x[0] && td.offsetLeft <= x[1] && td.offsetTop >= y[0] && td.offsetTop <= y[1]) {
          result.push(td)
        }
      })
    } else {
      $('td', this.el).forEach(td => {
        if (x(td)) {
          result.push(td)
        }
      })
    }
    return result
  }
  newId () {
    return `table_editor_${$('.namespace_table_editor').length}`
  }
  bindEvents () {
    this.el.addEventListener('mousedown', (e) => {
      if (e.buttons === 1) {
        this.downEvent(e)
      }
    })
    d.addEventListener('mouseup', (e) => {
      this.upEvent(e)
    })
    d.addEventListener('mousemove', (e) => {
      this.moveEvent(e)
    })
    this.el.addEventListener('contextmenu', (e) => {
      this.newContextMenu(e)
    })
  }
  downEvent (e) {
    // e.preventDefault()
    this.ms = 'down'
    if (e.target.tagName !== 'TD') return
    const td = e.target
    this.actd = null

    // if (['col-resize', 'row-resize', 'select'].includes(this.action)) {
    this.clearSelect()
    if (this.action === 'select') {
      this.actd = td
    } else if (this.action === 'col-resize') {
      if (e.offsetX >= td.offsetWidth - conf.cursorWidth) {
        this.actd = td
      } else if (e.offsetX <= conf.cursorWidth) {
        // 鼠标在cell左侧的时候计算要拖动的cell是哪个，默认应该是前一个td，但是有rowspan的干扰，所以要重新计算
        const tds = this.cellFilter(_cell => {
          if (_cell.offsetLeft + _cell.offsetWidth + conf.minWidth >= td.offsetLeft
            && _cell.offsetLeft + _cell.offsetWidth < td.offsetLeft + td.offsetWidth) return true
        })
        this.actd = tds[tds.length - 1]
      }
      this.startX = e.pageX
      this.startWidth = this.actd.offsetWidth
    } else if (this.action === 'row-resize') {
      if (e.offsetY >= td.offsetHeight - conf.cursorWidth) {
        this.actd = td
      } else if (e.offsetY <= conf.cursorWidth) {
        const tds = this.cellFilter(_cell => {
          if (_cell.offsetTop + _cell.offsetHeight + conf.minWidth >= td.offsetTop
            && _cell.offsetTop + _cell.offsetHeight < td.offsetTop + td.offsetHeight) return true
        })
        this.actd = tds[tds.length - 1]
      }
      this.startY = e.pageY
      this.startHeight = this.actd.offsetHeight
    }
    else {
      console.log('No action triggered.')
    }
  }
  upEvent (e) {
    // e.preventDefault()
    this.ms = 'up'
    this.actd = null
    this.el.style.cursor = 'default'
    // 选中td
    if (this.selectDirection && this.menuState === 'hidden') {
      // this.selectDirection = null
      this.newContextMenu(e, 'select')
    }
  }
  cancelResize (msg) {
    this.actd = null
    this.action = null
    this.ms = 'up'
    this.el.style.cursor = 'default'
    if (msg) alert(msg)
  }
  setAction (action) {
    if (action) {
      this.el.style.cursor = action
      this.action = action
    } else {
      this.el.style.cursor = 'default'
      this.action = null
    }
  }
  moveEvent (e) {
    if (this.ms === 'down') {
      if (isParent(e.target, this.el)) {
        e.preventDefault()
      }
      if (this.action === 'col-resize') {
        this.colResize(e)
      } else if (this.action === 'row-resize') {
        this.rowResize(e)
      } else if (this.action === 'select') {
        this.select(e)
      } else {
        console.log('No action triggered.')
      }
      return
    }
    const td = e.target
    this.setAction()
    if (isParent(e.target, this.el)) {
      e.preventDefault()
    } else {
      return
    }
    if (e.offsetX >= td.offsetWidth - conf.cursorWidth) {
      /**  colspan大于1的时候从右侧border拖动改变宽度时显示有点bug，要避免这个问题计算繁琐，直接避过。
       * 可以把parseInt(td.getAttribute('colspan')) <= 1这个限制条件去掉，在colspan大于1的单元格，从内侧拖动一下试试 **/
      if (td.offsetLeft !== 0 && getColSpan(td) <= 1) {
        this.setAction('col-resize')
      }
    } else if (e.offsetX <= conf.cursorWidth) {
      // 同上面colspan计算的问题，一样的问题，一样的处理
      if (td.offsetLeft !== 0 && getColSpan(td) <= 1) {
        this.setAction('col-resize')
      }
    } else if (e.offsetY >= td.offsetHeight - conf.cursorWidth) {
      // 同上面colspan计算的问题，一样的问题，一样的处理
      if (td.offsetTop !== 0 && getRowSpan(td) <= 1) {
        this.setAction('row-resize')
      }
    } else if (e.offsetY <= conf.cursorWidth) {
      if (td.offsetTop !== 0 && getRowSpan(td) <= 1) {
        this.setAction('row-resize')
      }
    } else if (isParent(e.target, this.el)) {
      this.action = 'select'
      this.el.style.cursor = 'default'
    }
  }
  colResize (e) {
    if (!this.actd) return
    let offset = e.pageX - this.startX
    const w = offset + this.startWidth
    const tds = this.cellFilter(this.actd.offsetLeft, -1)
    tds.forEach(td => {
      td.style.width = (w > conf.minWidth ? w : conf.minWidth) + 'px'
    })
  }
  rowResize (e) {
    if (!this.actd) return
    // const h = e.y - getPageY(this.actd)
    let offset = e.pageY - this.startY
    const h = offset + this.startHeight
    const tds = this.cellFilter(-1, this.actd.offsetTop)
    tds.forEach(td => {
      td.style.height = (h > conf.minHeight ? h : conf.minHeight) + 'px'
    })
    // const tds = this.cellFilter(this.actd.)
    // this.actd.style.height = (h > conf.minHeight ? h : conf.minHeight) + 'px'
  }
  select (e) {
    // addClass(this.actd, 'selected')
    const td = e.target
    if (td === this.actd) return
    if (!isParent(td, this.el)) return
    let sx = this.actd.offsetLeft, sy = this.actd.offsetTop
    let cx = td.offsetLeft, cy = td.offsetTop
    if (this.selectDirection) {
      $('td', this.el).forEach(_td => {
        removeClass(_td, 'selected')
      })
      if (this.selectDirection === 'y' && sx === cx) {
        this.cellFilter(sx, [sy, cy]).forEach(_td => {
          addClass(_td, 'selected')
        })
      } else if (this.selectDirection === 'x' && sy === cy) {
        this.cellFilter([sx, cx], sy).forEach(_td => {
          addClass(_td, 'selected')
        })
      }
    } else {
      if (getColSpan(td) !== getColSpan(this.actd) ||
        getRowSpan(td) !== getRowSpan(this.actd)) {
        console.warn('只有colspan和rowspan一样的单元格可以合并')
        return
      }
      if (sx === cx) {
        this.pushSelect(td, 'y')
      } else if (td === this.actd.previousSibling || td === this.actd.nextSibling) {
        this.pushSelect(td, 'x')
      }
    }
  }
  pushSelect (td, d) {
    addClass(td, 'selected')
    addClass(this.actd, 'selected')
    this.selectDirection = d
  }
  clearSelect () {
    const tds = this.el.querySelectorAll('.selected')
    tds.forEach(td => removeClass(td, 'selected'))
    this.selectDirection = null
  }
  newContextMenu (e, triggerBy) {
    e.preventDefault()
    let banMenu = []
    if (triggerBy === 'select') {
      let tds = $('.selected', this.el)
      if (!tds.length) return
      banMenu = ['configData', 'insertColumnAfter', 'deleteRow', 'deleteColumn', 'insertRowAfter', 'splitCell']
    } else {
      banMenu = ['mergeCells', 'splitCell']
      if (getColSpan(e.target) > 1 || getRowSpan(e.target) > 1) {
        banMenu.splice(banMenu.findIndex(b => b === 'splitCell'), 1)
        if (getColSpan(e.target) > 1) {
          banMenu.push('deleteColumn')
        }
        if (getRowSpan(e.target) > 1) {
          banMenu.push('deleteRow')
        }
      }
      this.clearSelect()
      addClass(e.target, 'selected')
    }
    // 弹出菜单
    let tpl = (() => {
      let str = ''
      Object.keys(this.menuList).forEach(k => {
        if (!banMenu.includes(k)) {
          str += `<li id="${k}">${this.menuList[k]}</li>`
        }
      })
      return str
    })()
    const menuHtml = `<ul>${tpl}</ul>`
    const rm = (e, f) => {
      if (!f && isParent(e.target, $('#new_context_menu'))) {
        return
      }
      this.clearSelect()
      // $('#new_context_menu').style.display = 'none'
      $('#new_context_menu').parentNode.removeChild($('#new_context_menu'))
      this.menuState = 'hidden'
      d.removeEventListener('mousedown', rm)
    }
    this.rm = rm
    // let tds = $('.selected', this.el)
    // if (!$('#new_context_menu')) {
    const div = d.createElement('div')
    div.id = 'new_context_menu'
    div.innerHTML = menuHtml
    div.style.left = e.x + 'px'
    div.style.visibility = 'hidden'
    div.style.top = e.y + 'px'
    // div.style.left = getPageX(tds[0]) + tds[0].offsetWidth + 'px'
    // div.style.top = getPageY(tds[0]) + tds[0].offsetHeight + 'px'
    div.addEventListener('contextmenu', (e) => {
      e.preventDefault()
    })
    d.body.appendChild(div)
    checkIfOutOfScreen(div, e.y)
    div.style.visibility = 'visible'
    this.bindMenuActions()
    // } 
    // else {
    //   const div = $('#new_context_menu')
    //   div.style.left = e.x + 'px'
    //   div.style.top = e.y + 'px'
    //   div.style.display = "block"
    // }
    d.addEventListener('mousedown', rm)
    this.menuState = 'shown'
    // 设置菜单是否可以操作
    // $('li', $('#new_context_menu')).forEach(li => {
    //   removeClass(li, 'disabled')
    //   if (banMenu.includes(li.id)) {
    //     addClass(li, 'disabled')
    //   }
    // })
  }
  splitCellFunc (td) {
    const rowspan = getRowSpan(td)
    const colspan = getColSpan(td)
    if (rowspan <= 1 && colspan <= 1) {
      return
    }
    const tr = td.parentNode
    const index = getIndex(tr)
    const trs = $('tr', this.el)
    for (let i = index; i < index + rowspan; i++) {
      for (let j = 0; j < colspan; j++) {
        if (i === index && j === 0) continue
        trs[i].appendChild(document.createElement('td'))
      }
    }
    td.setAttribute('colspan', 1)
    td.setAttribute('rowspan', 1)
  }
  bindMenuActions () {
    const that = this
    if ($('#insertColumnAfter')) {
      $('#insertColumnAfter').onclick = function () {
        if (hasClass(this, 'disabled')) return
        const tds = $('.selected', that.el)
        if (tds.length) {
          const last = tds[tds.length - 1]
          const index = getIndex(last)
          $('tr', that.el).forEach(v => {
            $('td', v).forEach((_td, k) => {
              if (k === index) {
                const newtd = d.createElement('td')
                newtd.style.width = conf.minWidth + 'px'
                insertAfter(newtd, _td)
              }
            })
          })
        }
      }
    }
    if ($('#insertRowAfter')) {
      $('#insertRowAfter').onclick = function () {
        if (hasClass(this, 'disabled')) return
        const tds = $('.selected', that.el)
        if (tds.length) {
          const last = tds[tds.length - 1]
          const trs = $('tr', that.el)
          let max = 0
          trs.forEach(tr => {
            let count = 0
            const _tds = $('td', tr)
            _tds.forEach(_td => {
              count += _td.getAttribute('colspan') ? parseInt(_td.getAttribute('colspan')) : 1
            })
            max = count > max ? count : max
          })
          const tr = d.createElement('tr')
          tr.innerHTML = (function () {
            let result = ''
            for (let i = 0; i < max; i++) {
              result += '<td style="height:' + conf.minHeight + 'px"></td>'
            }
            return result
          })()
          const pIndex = getIndex(last.parentNode) + getRowSpan(last)
          insertAfter(tr, trs[pIndex - 1])
        }
      }
    }
    if ($('#deleteRow')) {
      $('#deleteRow').onclick = function (e) {
        if (hasClass(this, 'disabled')) return
        const tds = $('.selected', that.el)
        if (tds.length) {
          const last = tds[tds.length - 1]
          let tr = last.parentNode
          $('td', tr).forEach(td => {
            if (getRowSpan(td) > 1) {
              that.splitCellFunc(td)
            }
          })
          const index = getIndex(tr)
          const bigTds = []
          while (tr.previousSibling) {
            const _curIndex = getIndex(tr.previousSibling)
            $('td', tr.previousSibling).forEach(td => {
              // index - _curIndex等于两个tr之间的距离，rowspan大于距离则删除列以后需要缩小rowspan
              if (getRowSpan(td) > index - _curIndex) bigTds.push(td)
            })
            tr = tr.previousSibling
          }
          bigTds.forEach(td => {
            td.setAttribute('rowspan', getRowSpan(td) - 1)
          })
          last.parentNode.parentNode.removeChild(last.parentNode)
        }
        that.rm(e, 'force')
      }
    }

    if ($('#deleteColumn')) {
      $('#deleteColumn').onclick = function (e) {
        if (hasClass(this, 'disabled')) return
        const tds = $('.selected', that.el)
        if (tds.length) {
          const last = tds[tds.length - 1]
          const index = getIndex(last)
          const trs = $('tr', this.el)
          trs.forEach(tr => {
            $('td', tr).forEach((td, k) => {
              if (k === index) {
                that.splitCellFunc(td)
              }
            })
          })
          const bigTds = []
          trs.forEach(tr => {
            let needDelete = true
            $('td', tr).forEach((td, k) => {
              // index-k等于两个td间的距离，colspan大于距离则删除列以后需要缩小colspan
              if (k < index && getColSpan(td) > index - k) {
                bigTds.push(td)
                needDelete = false
              } else if (needDelete && k === index) {
                td.parentNode.removeChild(td)
              }
            })
          })
          bigTds.forEach(td => {
            td.setAttribute('colspan', getColSpan(td) - 1)
          })
        }
        that.rm(e, 'force')
      }
    }

    if ($('#mergeCells')) {
      $('#mergeCells').onclick = function (e) {
        if (hasClass(this, 'disabled')) return
        const tds = $('.selected', that.el)
        if (tds.length > 1) {
          let cellNum = 0
          if (that.selectDirection === 'x') {
            tds.forEach(td => {
              cellNum += getColSpan(td)
            })
            tds[0].setAttribute('colspan', cellNum)
          } else if (that.selectDirection === 'y') {
            tds.forEach(td => {
              cellNum += getRowSpan(td)
            })
            tds[0].setAttribute('rowspan', cellNum)
          } else {
            console.warn('No cell to merge.')
          }
          let content = tds[0].innerHTML
          tds.forEach((td, k) => {
            if (k === 0) return
            content += td.innerHTML
            td.parentNode.removeChild(td)
          })
          tds[0].innerHTML = content
        }
        that.rm(e, 'force')
      }
    }

    if ($('#splitCell')) {
      $('#splitCell').onclick = function (e) {
        if (hasClass(this, 'disabled')) return
        const tds = $('.selected', that.el)
        if (tds.length) {
          const last = tds[tds.length - 1]
          that.splitCellFunc(last)
        }
        that.rm(e, 'force')
      }
    }

    if ($('#cellStyle')) {
      $('#cellStyle').onclick = function () {
        if (hasClass(this, 'disabled')) return
        const tds = $('.selected', that.el)
        if (tds.length) {
          that.getTemplate('styleTemplate', function () {
            console.log(123)
            that.bindStyleEvents(tds)
          })
        }
      }
    }

    // if ($('#configData')) {
    //   $('#configData').onclick = function () {
    //     if (hasClass(this, 'disabled')) return
    //     const tds = $('.selected', that.el)
    //     if (tds.length) {
    //       that.getTemplate('configDataTemplate', function () {
    //         that.bindStyleEvents(tds)
    //       })
    //     }
    //   }
    // }
  }

  getTemplate (name, callback) {
    const container = $('#new_context_menu')
    container.style.left = parseInt(container.style.left) + 30 + 'px'
    container.innerHTML = this[name]()
    checkIfOutOfScreen(container, parseInt(container.style.top))
    callback()
  }

  // configDataTemplate () {
  //   const tds = $('.selected', this.el)
  //   const last = tds[tds.length - 1]
  //   let html = '<ul id="namespace_data_ul">'


  //   html += '</ul>'
  //   return html
  // }

  styleTemplate () {
    const tds = $('.selected', this.el)
    const last = tds[tds.length - 1]
    let html = '<ul id="namespace_style_ul">'
    Object.keys(this.styleList).forEach(key => {
      html += `<li><div class="namespace_left_div">${this.styleList[key]}：</div>
      <div class="namespace_right_div">`
      if (key === 'textAlign') {
        html += `<select id="namespace_${key}">
          <option ${last.style[key] === 'left' ? 'selected' : ''} value="left">左对齐</option>
          <option ${last.style[key] === 'center' ? 'selected' : ''} value="center">居中</option>
          <option ${last.style[key] === 'right' ? 'selected' : ''} value="right">右对齐</option>
        </select>`
      } else if (key === 'verticalAlign') {
        html += `<select id="namespace_${key}">
          <option ${last.style[key] === 'top' ? 'selected' : ''} value="top">顶部对齐</option>
          <option ${last.style[key] === 'middle' ? 'selected' : ''} value="middle">居中</option>
          <option ${last.style[key] === 'bottom' ? 'selected' : ''} value="bottom">底部对齐</option>
        </select>`
      } else {
        html += `<input id="namespace_${key}" type="number" value="${last.style[key].replace('px', '')}"> px</div>`
      }
      html += `</li>`
    })
    // html += '<li><button class="namespace_save_style">保存样式</button></li></ul>'
    html += '</ul>'
    return html
  }
  bindStyleEvents (tds) {
    $('select,input', $("#namespace_style_ul")).forEach(el => {
      if (el.tagName === 'SELECT') {
        el.onchange = function () {
          if (el.value !== '') {
            tds.forEach(td => {
              td.style[el.id.replace('namespace_', '')] = el.value
            })
          }
        }
      } else if (el.tagName === 'INPUT') {
        el.oninput = function () {
          if (el.value !== '') {
            tds.forEach(td => {
              td.style[el.id.replace('namespace_', '')] = el.value + 'px'
            })
          }
        }
      }
    })
  }
}

export default TableEditor
