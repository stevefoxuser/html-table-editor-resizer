> Quick start  

### npm install  

### npm run dev  

### 查看 localhost:8080

> 初始化 Initialize  
### 三种方式 初始化表格
### Three ways to initialize your table
```javascript
import TableEditor from "./tableEditor"
// better to replace document.body with your own div container
// 最好把body换成某个空的div容器，这个div不要放其他元素
const t = new TableEditor()

t.Create(10, 10, document.body)

// or
t.CreateFromString('<table><tr><td></td><td></td></tr><tr><td></td><td></td></tr></table>',document.body)

// or
t.CreateFromElem(document.querySelector('#YourTable'),document.body)

// do some edit .....

// 编辑完表格以后获取编辑后的结果
// get the edited table
console.log(t.GetTable())
console.log(t.GetTableStr())
```

### to do
### 增加绑定服务端数据源的功能  
### 增加更多浏览器适配  
### 需要在ES5环境下运行的话需要自己babel转一下，目前在完善功能，最后会加上ES5版本。  
