import TableEditor from "./tableEditor"
function init () {
  const $ = function (str) {
    return str[0] === '#' ? document.querySelector(str) : document.querySelectorAll(str)
  }
  const t = new TableEditor()
  $('#btn').addEventListener('click', function () {
    var rows = parseInt($('#rows').value)
    var columns = parseInt($('#columns').value)
    t.Create(rows, columns, $('#container'))
  })

  $('#btn2').addEventListener('click', function () {
    alert(t.toString())
  })

  $('#btn').click()
}


export default init