var loaderUtils = require("loader-utils");
var validateOptions = require("schema-utils");
var sqip = require("sqip");
var schema = require("./options.json");

// https://codepen.io/tigt/post/optimizing-svgs-in-data-uris
function encodeSvgDataUri(svg) {
    var uriPayload = encodeURIComponent(svg)
        .replace(/%0A/g, "")
        .replace(/%20/g, " ")
        .replace(/%3D/g, "=")
        .replace(/%3A/g, ":")
        .replace(/%2F/g, "/")
        .replace(/%22/g, "'");

    return "data:image/svg+xml," + uriPayload;
}

module.exports = function (source) {
    // 接收webp-loader传递过来的buffer
    var contentBuffer = source.buffer;
    this.cacheable && this.cacheable(true);

    // 获取options并校验
    var options = loaderUtils.getOptions(this) || {};
    validateOptions(schema, options, "SQIP Loader");

    if (contentBuffer) {
        var content = contentBuffer.toString("utf8");
        var filePath = this.resourcePath;
        var contentIsUrlExport = /^module.exports = "data:(.*)base64,(.*)/.test(content);
        //var contentIsFileExport = /^module.exports = (.*)/.test(content);
        var src = "";

        // 对于base64格式的内联图片，不做任何处理，直接返回
        if (contentIsUrlExport) {
            src = content.match(/^module.exports = (.*)/)[1];
            if (options.skipPreviewIfBase64) {
                return 'module.exports = { "originSrc": ' + src + ', "preview": "" };';
            }
        }
        // svg格式的图片也不做处理，直接返回(svg不需要placeholder)
        if (filePath.split('.').pop() === 'svg') { 
            return 'module.exports = { "originSrc":__webpack_public_path__ +"' + source.url + '", "preview": "" };';
        }
    }
    // 处理loader options
    var numberOfPrimitives = "numberOfPrimitives" in options ? parseInt(options.numberOfPrimitives, 10) : 20;
    var mode = "mode" in options ? parseInt(options.mode, 10) : 0;
    var blur = "blur" in options ? parseInt(options.blur, 10) : 12;
    // 生成svg格式的占位符图片
    var sqipResult = sqip({
        filename: filePath,
        numberOfPrimitives: numberOfPrimitives,
        mode: mode,
        blur: blur
    });
    var encodedSvgDataUri = encodeSvgDataUri(sqipResult.final_svg);
    var dimensions = JSON.stringify(sqipResult.img_dimensions)
    // 拼接需要返回的module
    return 'module.exports = {' +
        '"originSrc": __webpack_public_path__ + "' + source.url +
        '" , "webpSrc": __webpack_public_path__ + "' + source.webpUrl +
        '" , "preview": "' + encodedSvgDataUri +
        '", "dimensions": ' + dimensions +
        ' };';
};