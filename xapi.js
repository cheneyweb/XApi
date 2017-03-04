var fs = require('fs'); // 引入文件处理工具

// 请求头部
let httpHead = 'http://localhost:8888/alpha';
// 默认根请求的method方法
let defaultRootRequestMethod = 'POST';
// 需要查找接口的文件规则
let regex = /ApiController.java$/;
// 初步筛选RESTful接口的规则
let restfulRegex = /@RequestMapping.*(value)?.*\"(.*)\".*\)/ig;
// 精确匹配RESTful接口的规则
let restfulDetailRegex = /@RequestMapping.*(value)?.*\"(.*)\".*\)/i;
// 生成的json文件
let jsonFile = 'static/restful.json';
// 系统配置文件
let configFile = 'static/config.json';

var allFileList = []; // 所有文件列表
var lastApis = []; // 上次保存的接口对象数组
var apis = []; // 所有的接口列表

let configcontent = fs.readFileSync(configFile, 'utf-8');
if (configcontent != null && configcontent != '') {
    let config = JSON.parse(configcontent);
    httpHead = config.httpHead;
    defaultRootRequestMethod = config.defaultRootRequestMethod;
    jsonFile = config.jsonFile;
}

var xapi = {
    /**
     * [readLastApi 初始化：预先读取json文件，转化成lastApis]
     * @return {[type]} [lastApis]
     */
    readLastApi: function() {
        // console.log('开始读取接口文档');
        allFileList = [];
        lastApis = [];
        apis = [];
        let filecontent = fs.readFileSync(jsonFile, 'utf-8');
        if (filecontent != null && filecontent != '') {
            lastApis = JSON.parse(filecontent);
        }
        // console.log('结束读取接口文档');
        return lastApis;
    },
    /**
     * [walkSync 遍历指定路径下的所有文件]
     * @param  {[string]} path [根路径]
     * @return {[stringlist]}  [文件列表]
     */
    walkSync: function(path) {
        var dirList = fs.readdirSync(path);
        dirList.forEach(function(item) {
            if (fs.statSync(path + '/' + item).isDirectory()) {
                xapi.walkSync(path + '/' + item);
            } else {
                allFileList.push(path + '/' + item);
            }
        });
        return allFileList;
    },
    /**
     * [matchApiFile 匹配接口文件]
     * @param  {[type]} allFileList [所有的文件列表]
     * @return {[type]}             [匹配的文件列表]
     */
    matchApiFile: function(allFileList) {
        var regFileList = []; // 匹配文件列表
        // 第二步：筛选出匹配的文件
        allFileList.forEach(function(filename) {
            if (regex.test(filename)) {
                regFileList.push(filename);
            }
        });
        return regFileList;
    },
    /**
     * 第三步：循环读取每个文件的内容，提取RESTful接口
     * [matchRestApi description]
     * @param  {[数组]} regFileList [匹配的接口列表]
     * @return {[数组]} apis        [所有接口]
     */
    matchRestApi: function(regFileList) {
        regFileList.forEach(function(filename) {
            // 3.1 初步匹配RESTful接口
            let filecontent = fs.readFileSync(filename, 'utf-8');
            let restfulArr = filecontent.match(restfulRegex);

            // 3.2循环每个文件内所有的RESTful接口，精确提取
            var requestHead = '';
            restfulArr.forEach(function(restfulapi, index) {
                // 精确提取请求url
                let request = restfulapi.match(restfulDetailRegex)[2];
                var api = {};
                // ROOT请求
                if (index == 0) {
                    // 设置ROOT请求
                    requestHead = request;
                    // 如果ROOT请求被单独使用
                    if (defaultRootRequestMethod != null) {
                        api.name = '';
                        api.req = httpHead + request;
                        api.method = defaultRootRequestMethod;
                        api.body = '';
                        api.respCode = '';
                        api.respData = '';
                        api.isRoot = true;
                    } else {
                        api.name = '';
                        api.req = request;
                        api.method = '';
                        api.body = '';
                        api.respCode = '';
                        api.respData = '';
                        api.isRoot = true;
                    }
                }
                // 非ROOT请求
                else {
                    // 处理根url和子url中间的/衔接问题
                    if (httpHead.charAt(httpHead.length - 1) == '/' || request.charAt(0) == '/') {
                        request = requestHead + request;
                    } else {
                        request = requestHead + '/' + request;
                    }
                    api.name = '';
                    api.req = httpHead + request;
                    // 判断有没有包含POST参数
                    if (restfulapi.indexOf('POST') != -1) {
                        api.method = 'POST';
                    } else {
                        api.method = 'GET';
                    }
                    api.body = '';
                    api.respCode = '';
                    api.respData = '';
                    api.isRoot = false;
                }
                // 将上次保存apis中的请求数据匹配存入
                lastApis.forEach(function(lastRestfulapi) {
                    if (api.req == lastRestfulapi.req && api.method == lastRestfulapi.method) {
                        api = lastRestfulapi;
                        return false;
                    }
                });
                // 将每个接口对象放置到数组中
                apis.push(api);
            });
        });
        return apis;
    },
    /**
     * [writeApiFile 异步将apis写入文件]
     * @param  {[type]} apis     [apis对象]
     */
    writeApiFile: function(apis) {
        // console.log('开始更新接口文档');
        let apisStr = JSON.stringify(apis);
        fs.writeFile(jsonFile, apisStr, function() {
            console.log('接口文档更新完成');
        });
    }
}

module.exports = xapi;
