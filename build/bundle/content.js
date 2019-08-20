webpackJsonp([2,3],[
/* 0 */
/***/ (function(module, exports) {

	"use strict";

	chrome.extension.onMessage.addListener(function (request, sender, sendResponse) {
	    alert("content收到");
	    sendResponse("popup返回值");
	});

/***/ })
]);