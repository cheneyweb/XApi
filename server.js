/**
 * RESTful接口提取服务
 * dev by cheneyxu 2017.03.04
 * 457299596@qq.com
 */
var express = require('express'); // 引入express模块
var proxy = require('express-http-proxy'); // 引入express转发模块
var bodyParser = require('body-parser'); // 引入express转发模块
var fs = require('fs'); // 引入文件处理工具
var xapi = require('./xapi.js') // 引入xapi模块

// 需要扫描的代码路径
let srcPath = '/Users/cheney/Documents/gitlab/alpha-api/src/main/java';
// 服务器参数设置
let serverRoot = '/';// 静态服务根目录
let staticPath = 'static';// 静态资源路径
let proxyRoot = '/alpha';// 转发请求拦截路径
let proxyHost = 'http://localhost:8888';// 转发目的HOST
// 一般不需要变更的配置
let port = 8070;// 服务监听端口
let configFile = 'static/config.json';// 系统配置文件

// ================================脚本开始执行...==================================
// 加载配置文件
let configcontent = fs.readFileSync(configFile, 'utf-8');
if (configcontent != null && configcontent != '') {
    let config = JSON.parse(configcontent);
    srcPath = config.srcPath;
    port = config.port;
    staticPath = config.staticPath;
    serverRoot = config.serverRoot;
    proxyRoot = config.proxyRoot;
    proxyHost = config.proxyHost;
}

// ================================服务器部分begin==================================
// 启动服务，监听端口
var app = express();
// 静态资源服务
app.use(serverRoot, express.static(staticPath));
app.use(bodyParser.json());
// 处理全部保存请求
app.post('/xapi/save', function(req, res) {
    xapi.writeApiFile(req.body);
    res.send('Y');
});
// 重新加载代码接口
app.get('/xapi/reload', function(req, res) {
    // 初始化：读取旧的json文件
    xapi.readLastApi();
    // 第一步：遍历指定路径下的所有代码文件
    let allFileList = xapi.walkSync(srcPath);
    // 第二步：匹配接口文件
    let regFileList = xapi.matchApiFile(allFileList);
    // 第三步：提取REST接口
    let apis = xapi.matchRestApi(regFileList);
    // 最后一步：将结果写restful.json文件
    xapi.writeApiFile(apis);
    res.send('Y');
});
// 处理变更代码路径请求(暂未实现)
app.post('/xapi/setsrcpath', function(req, res) {
    res.send('Y');
});
// 处理转发请求
app.use(proxyRoot, proxy('localhost:8888/alpha', {
    forwardPath: function(req, res) {
        var targeturl = proxyHost + req._parsedUrl.path;
        return targeturl;
    },
    intercept: function(rsp, data, req, res, callback) {
        // data = JSON.parse(data.toString('utf8'));
        // console.info(data.toString('utf8'));
        req.body = JSON.stringify(req.body);
        data = JSON.stringify(data.toString('utf8'))
        callback(null,data);
    },
}));
// 监听服务
app.listen(port, function() {
    console.log('XApi Server is listening at port:%s', port);
});
/*
app.post('/xapi/proxy', function(req, res) {
    globalRes = res;
    if (req.body.method == 'POST') {
        proxyPOST(req);
    } else if (req.body.method == 'GET') {
        proxyGET(req);
    }
});

function proxyPOST(req) {
    let reqItem = req.body;
    var resItem = {};
    var jsonObj = null;
    try {
        jsonObj = JSON.parse(reqItem.body);
    } catch (e) {
        resItem.status = 'error';
        resItem.headers = '';
        resItem.body = e.message;
        console.info(e);
    }
    if (jsonObj != null) {
        let syncOptions = {
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            json: jsonObj,
            timeout: 10000
        };
        var res = syncRequest('POST', reqItem.req, syncOptions);
        resItem.status = res.statusCode;
        resItem.headers = res.headers;
        resItem.body = res.getBody('utf8');
    }
    globalRes.send(resItem);
}

function proxyGET(req) {
    let reqItem = req.body;
    var resItem = {};
    let syncOptions = {
        timeout: 10000
    };
    // 判断是否包含路径参数(目前仅支持单路径参数)
    if (reqItem.req.indexOf('{') != -1) {
        let pathParam = reqItem.body.trim().split('=')[1];
        let pathParamRegex = /{.*}/;
        let regexRes = reqItem.req.replace(pathParamRegex, pathParam);
        reqItem.req = regexRes;
    } else {
        reqItem.req += '?' + reqItem.body;
    }
    var res = syncRequest('GET', reqItem.req, syncOptions);
    resItem.status = res.statusCode;
    resItem.headers = res.headers;
    resItem.body = res.getBody('utf8');
    globalRes.send(resItem);
}
*/
// ================================服务器部分end====================================

// 初始化：读取旧的json文件
xapi.readLastApi();
// 第一步：遍历指定路径下的所有代码文件
let allFileList = xapi.walkSync(srcPath);
// 第二步：匹配接口文件
let regFileList = xapi.matchApiFile(allFileList);
// 第三步：提取REST接口
let apis = xapi.matchRestApi(regFileList);
// 最后一步：将结果写restful.json文件
xapi.writeApiFile(apis);
