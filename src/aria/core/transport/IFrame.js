/**
 * Copyright 2012 Amadeus s.a.s.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Transport class for IFrame.
 */
Aria.classDefinition({
	$classpath : "aria.core.transport.IFrame",
	$singleton : true,
	$implements : ["aria.core.transport.ITransports"],
	$constructor : function () {
		/**
		 * Tells if the transport object is ready or requires an initialization phase
		 * @type Boolean
		 */
		this.isReady = true;

		/**
		 * Map of ongoing request parameters
		 * @type Object
		 * @protected
		 */
		this._requestParams = {};
	},
	$statics : {
		ERROR_DURING_SUBMIT : "An error occurred while submitting the form (form.submit() raised an exception)."
	},
	$prototype : {
		/**
		 * Initialization function. Not needed because this transport is ready at creation time
		 */
		init : function () {},

		/**
		 * Perform a request.
		 * @return {Object} connection object
		 */
		request : function () {
			var request = this._createRequest(arguments);
			this._createIFrame(request);
			this._submitForm(request);
		},

		/**
		 * A helper method to create a request object from the arguments array.
		 * @param {Array} args
		 * @return {Object} request object extracted from the arguments array.
		 * @protected
		 */
		_createRequest : function (args) {
			var req = {
				reqId : args[0],
				method : args[1],
				url : args[2],
				callback : args[3],
				postData : args[4],
				form : args[5]
			};
			this.$assert(56, this._requestParams[req.reqId] == null); // we should never override an existing request
			this._requestParams[req.reqId] = req;
			return req;
		},

		/**
		 * Delete a request created with _createRequest.
		 * @param {Object} request generated by this._createRequest
		 */
		_deleteRequest : function (request) {
			var iFrame = request.iFrame;
			if (iFrame) {
				var domEltToRemove = request.iFrameContainer || iFrame;
				domEltToRemove.parentNode.removeChild(domEltToRemove);
				// avoid leaks:
				request.iFrameContainer = null;
				request.iFrame = null;
				iFrame.onload = null;
				iFrame.onreadystatechange = null;
			}
			delete this._requestParams[request.reqId];
		},

		/**
		 * Updates the form to target the iframe then calls the forms submit method.
		 * @param {Object} request generated by this._createRequest
		 * @protected
		 */
		_submitForm : function (request) {
			var form = request.form;
			form.target = "xIFrame" + request.reqId;
			form.action = request.url;
			form.method = request.method;
			try {
				form.submit();
			} catch (e) {
				this.$logError(this.ERROR_DURING_SUBMIT, null, e);
				this._deleteRequest(request);
				aria.core.IO._handleTransactionResponse({
					conn : {
						status : 0,
						responseText : null,
						getAllResponseHeaders : function () {}
					},
					transaction : request.reqId
				}, request.callback, true);
			}
		},

		/**
		 * Creates an iFrame to load the response of the request.
		 * @param {Object} request generated by this._createRequest
		 * @protected
		 */
		_createIFrame : function (request) {
			var iFrame;
			var browser = aria.core.Browser;
			var document = Aria.$frameworkWindow.document;

			// Issue when using document.createElement("iframe") in IE7
			if (browser.isIE7 || browser.isIE6) {
				var container = document.createElement("div");
				container.innerHTML = ['<iframe style="display:none" src="',
						aria.core.DownloadMgr.resolveURL("aria/core/transport/iframeSource.txt"), '" id="xIFrame',
						request.reqId, '" name="xIFrame', request.reqId, '"></iframe>'].join('');
				document.body.appendChild(container);
				iFrame = document.getElementById("xIFrame" + request.reqId);
				request.iFrameContainer = container;
			} else {
				iFrame = document.createElement("iframe");
				iFrame.src = aria.core.DownloadMgr.resolveURL("aria/core/transport/iframeSource.txt");
				iFrame.id = iFrame.name = "xIFrame" + request.reqId;
				iFrame.style.cssText = "display:none";
				document.body.appendChild(iFrame);
			}
			request.iFrame = iFrame;

			// Event handlers
			iFrame.onload = iFrame.onreadystatechange = this._iFrameReady;
		},

		/**
		 * load and readystatechange event handler on the iFrame.
		 * @param {DOMEvent} event
		 */
		_iFrameReady : function (event) {
			// This method cannot use 'this' because the scope is not aria.core.transport.IFrame when this method is
			// called. It uses oSelf instead.
			var event = event || Aria.$frameworkWindow.event;
			var iFrame = event.target || event.srcElement;
			if (!iFrame.readyState || /loaded|complete/.test(iFrame.readyState)) {
				var oSelf = aria.core.transport.IFrame;
				var reqId = /^xIFrame(\d+)$/.exec(iFrame.id)[1];
				var request = oSelf._requestParams[reqId];
				oSelf._sendBackResult(request);
			}
		},

		/**
		 * Sends back the results of the request
		 * @param {Object} request generated by this._createRequest
		 * @protected
		 */
		_sendBackResult : function (request) {
			var iFrame = request.iFrame;
			var responseText, contentDocument = iFrame.contentDocument, contentWindow;

			if (contentDocument == null) {
				var contentWindow = iFrame.contentWindow;
				if (contentWindow) {
					contentDocument = contentWindow.document;
				}
			}
			if (contentDocument) {
				var body = contentDocument.body || contentDocument.documentElement;
				if (body) {
					// this is for content displayed as text:
					responseText = body.textContent || body.outerText;
				}
				var xmlDoc = contentDocument.XMLDocument;
				// In IE, contentDocument contains a transformation of the document
				// see: http://www.aspnet-answers.com/microsoft/JScript/29847637/javascript-ie-xml.aspx
				if (xmlDoc) {
					contentDocument = xmlDoc;
				}
			}

			this._deleteRequest(request);

			// Callback if not abort
			aria.core.IO._handleTransactionResponse({
				conn : {
					status : 200,
					responseText : responseText,
					responseXML : contentDocument,
					getAllResponseHeaders : function () {}
				},
				transaction : request.reqId
			}, request.callback, false);
		}

	}
});