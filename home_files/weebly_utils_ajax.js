
window.Weebly = window.Weebly || {};

// Global CSRF helper functions - used by AJAX calls to protected endpoints
window.getCsrfToken = function() {
	var meta = document.querySelector('meta[name="_csrf"]');
	return (meta && meta.getAttribute('content')) || (window.Weebly && window.Weebly.CSRFRequestToken) || '';
};
window.getCsrfHeaders = function() {
	return { 'X-CSRF-TOKEN': window.getCsrfToken() };
};

var settingAnimations = 0;
var settingQuickExport = 0;
var settingTooltips = 0;
var uploadInProgress = 0;
var exiting = 0;
var ajax = '/weebly/getElements.php';
var ajaxStatusCheckTimeout = 4000;
var ajaxStatusTimeoutGrowthFactor = 1;
Weebly.ajaxLog = [];

window.onbeforeunload = function() {
	exiting = 1;
}

//Add CSRF token to all AJAX request headers and parameters
jQuery.ajaxPrefilter(function (options, originalOptions, jqXHR) {
	// apply CSRF token to only getElements.php
	var csrfUrlRegex = /\/(weebly|editor)\/getElements\.php(\?.*)?$/;
	if (csrfUrlRegex.test(options.url)) {
		//Set CSRF token in request header for request security/validation
		jqXHR.setRequestHeader('X-CSRF-TOKEN', Weebly.CSRFRequestToken);

		//Logic to add CSRF token to request parameters
		if (originalOptions.data) {
			//If single option object
			if (typeof originalOptions.data === 'object') {
				options.data = jQuery.param(jQuery.extend(originalOptions.data, {'_csrf': Weebly.CSRFRequestToken}));

			} else {
				try {
					var requests = JSON.parse(originalOptions.data);
					//If array of requests. Add CSRF token to all requests
					if (requests instanceof Array) {
						options.data = JSON.stringify(requests.each(function (i) {
							jQuery.extend(i, {'_csrf': Weebly.CSRFRequestToken})
						}));
					} else {
						//If single request
						options.data = JSON.stringify(jQuery.extend(requests, {'_csrf': Weebly.CSRFRequestToken}));
					}
				} catch (ex) {
					// SyntaxError usually points to a JSON.parse failure, assume this is urlencoded
					if (ex instanceof SyntaxError) {
						options.data += '&_csrf=' + Weebly.CSRFRequestToken;
					} else {
						throw ex; // rethrow all other errors
					}
				}
			}
		} else {
			//If for some reason we make a request with no data still attach a csrf token
			options.data = JSON.stringify({'_csrf' : Weebly.CSRFRequestToken});
		}
	}
});

var myGlobalHandlers = {
	onCreate: function(ajax, t) {
		t.request.times = {
			start: new Date().getTime()
		};
		if (!ajax.options.bgRequest) {
			startWait();
		}
		if (ajax.parameters && ajax.parameters.pos) {
			Weebly.ajaxLog.push(ajax.parameters.pos);
			if (Weebly.ajaxLog.size() > 10) {
				Weebly.ajaxLog.shift();
			}
		}

		ajax.options.requestHeaders = ajax.options.requestHeaders || {};

		// apply CSRF token to only getElements.php
		var csrfUrlRegex = /\/(weebly|editor)\/getElements\.php(\?.*)?$/;
		if (csrfUrlRegex.test(ajax.url)) {
			//Set CSRF token in request header for request security/validation
			ajax.options.requestHeaders['X-CSRF-TOKEN'] = Weebly.CSRFRequestToken;
			/* Since Prototype is used to send some of our AJAX requests parameters, in this case a CSRF token,
			 can only be added by modifying the request url */
			ajax.url += (ajax.url.include('?') ? '&' : '?') + '_csrf=' + Weebly.CSRFRequestToken;
		}

		// Set Weebly-Site-ID header
		if (typeof (currentSite) != "undefined") {
			ajax.options.requestHeaders['Weebly-Site-ID'] = currentSite;
		}
		if (!ajax.options.requestHeaders['x-ajax-request-id']) {
			var ajax_request_id = new Date().getTime() + '' + Math.floor(Math.random() * 999);
			ajax.options.requestHeaders['x-ajax-request-id'] = ajax_request_id;
		}
		if (ajax.options.isRetry && ajax.options.previouslyAborted) {
			ajax.options.requestHeaders['x-ajax-abort-retry'] = ajaxStatusCheckTimeout;
		}

		if (!ajax.options.isRetry && !Prototype.Browser.IE6) {
			setTimeout(function() {
				checkAjaxRequestStatus(ajax)
			}, ajaxStatusCheckTimeout);
		}
	},

	onLoading: function(ajax, t) {
		if (t.request.times && t.request.times.start) {
			t.request.times.initialized = new Date().getTime() - t.request.times.start;
		}
	},

	onLoaded: function(ajax, t) {
		if (t.request.times && t.request.times.start) {
			t.request.times.sent = new Date().getTime() - t.request.times.start;
			if (ajax.options.isRetry && t.request.times.sent > (ajaxStatusCheckTimeout / 2)) {
				ajaxStatusCheckTimeout = ajaxStatusCheckTimeout + ajaxStatusCheckTimeout * ajaxStatusTimeoutGrowthFactor;
				ajaxStatusTimeoutGrowthFactor = ajaxStatusTimeoutGrowthFactor * .9;
			}
		}
	},

	onInteractive: function(ajax, t) {
		if (t.request.times && t.request.times.start && !t.request.times.response) {
			t.request.times.response = new Date().getTime() - t.request.times.start;
		}
	},

	onComplete: function(ajax, t) {

		if (t.status == 0 && !ajax.aborted) {
			retriableErrFunc(ajax, t);
			return false;
		}

		if (t.request.times && t.request.times.start) {
			t.request.times.end = new Date().getTime();
			t.request.times.complete = t.request.times.end - t.request.times.start;
		}
		if (!ajax.options.bgRequest) {
			endWait();
		}
		if (ajax.isRetriable()) {
			ajax.retry();
		}
		else {
			handleLogout(t, ajax);
		}
	},

	onException: endWait

};

if (window.Ajax) {
	Ajax.Responders.register(myGlobalHandlers);
}

/**
 * Start spinning loading animation
 * @param {string} [loadingText = 'Loading'] Change loading message
 * @param {boolean} [nodelay = false] Delay showing animation
 */
function startWait(loadingText, nodelay) {
	try {
		loadingText = loadingText || _W.utl('html.weebly.libraries.weebly_utils_ajax_1');
		window.pushLoading();
		jQuery('#pleaseWait').toggleClass('no-delay', !!nodelay)
			.find('.loading-text').text(loadingText);
	}
	catch (e) {}
}

/**
 * Remove spinning loading animation, reset to defaults
 */
function endWait() {
	var target;
	try {
		window.popLoading();
		target = jQuery('#pleaseWait')
			.find('.loading-text').text(_W.utl('html.weebly.libraries.weebly_utils_ajax_2'));
	}
	catch (e) {}
}

function setSetting(setting, value) {
	if (typeof (value) == "string" && value.match(/{/)) {
		value = value.replace(/^'/, '');
		value = value.replace(/'$/, '');
	}
	eval(setting + " = " + value + ";");
}

function handleLogout(t, ajax) {

	// Check if user is logged in; if not, redirect.
	//---- Note: This javascript redirect is for convenience purposes for the user
	//---- At this point, the user is fully logged out of the system from the
	//---- Server's perspective, so it will refuse to furnish any additional data.

	var header;
	try {
		header = t.getHeader("Weebly-Auth-Msg");
	}
	catch (e) {}

	header = header || '';

	if (header.match("not-logged-in")) {
		window.onbeforeunload = null;
		document.location = "/?session-expired=1";
	}
	else if (header.match("database-error")) {
		retriableErrFunc(ajax, t, header);
	}
	else if (header.match("query-error")) {
		retriableErrFunc(ajax, t, header);
	}
	else if (header.match("account-deleted")) {
		window.onbeforeunload = null;
		document.location = "logout.php";
	}
	else if (header.match("refresh-build")) {
		if (!(typeof (currentBlog) != "undefined" && currentBlog.postId && currentBlog.postId == 1)) {
			window.onbeforeunload = null;
			refreshMe();
		}
	}
	else if (header.match("maintenance-soon")) {
		var maintLength = header.match(/maintenance-soon\(([^\)]+)\)/);
		window.onbeforeunload = null;
		maintenanceSoon(maintLength[1]);
	}

}

function maintenanceSoon(maintLength) {

	$('maintenanceLength').innerHTML = maintLength;
	Element.show('maintenanceDiv');

}

function refreshMe() {

	Element.show('refreshingDiv');
	Element.show('grayedOut');
	setTimeout("window.location.reload();", 4000);

}

function retriableErrFunc(ajax, t, header) {

	endWait();

	if (ajax.options.failSilently) {
		return;
	}
	if (exiting) {
		return;
	}

	if (t.status == 0) {
		showRetriableError(_W.utl('html.weebly.libraries.weebly_utils_ajax_3'), ajax,
			false);
	}
	else if (header.match("database-error")) {
		showRetriableError(
			_W.utl('html.weebly.libraries.weebly_utils_ajax_4'),
			ajax, false);
	}
	else if (header.match("query-error")) {
		showRetriableError(
			_W.utl('html.weebly.libraries.weebly_utils_ajax_5'), ajax,
			true);
	}

}

function errFunc(t) {
	if (t && t.request && t.request.isRetriable())
		return;

	showError(_W.utl('html.weebly.libraries.weebly_utils_ajax_6'), t);
}

function exceptionFunc(t, exception, xx) {
	if (t.isRetriable())
		return;

	if (t && (!t.getStatus || !t.getStatus() || t.getStatus() < 100 || t.getStatus() > 500)) { // will only retry if xhr or network related problem
		try {
			var options = t.options || {}, retryCount = options._retryCount || 0;
			if (retryCount <= 1) { // will retry a max of 2 times
				options._retryCount = ++retryCount;
				new Ajax.Request(t.url, options);
			}
			else {
				showError(_W.utl('html.weebly.libraries.weebly_utils_ajax_7')+ exception.message);
				// ^ will also report error to stats
			}
		}
		catch (e) {}
	}
	else if (window.console && console.log) {
		// couldn't throw it for some reason, so console.log it if possible
		if (typeof exception == 'object') {
			for ( var k in exception) {
				if (typeof exception[k] != 'function') {
					console.log(k + ': ' + exception[k]);
				}
			}
		}
		else {
			console.log(exception);
		}
	}
}

function checkAjaxRequestStatus(ajax) {
	if (!ajax._complete && Prototype.Browser.IE && !ajax.times.sent) {
		ajax.abort();
	}
}

if (window.Ajax) {
	Ajax.Request.addMethods({
		abort: function() {
			if (this._complete)
				return;

			// avoid MSIE/Mozilla calling other event handlers when aborted
			this.transport.onreadystatechange = Prototype.emptyFunction;
			this.transport.abort();
			this._complete = true;
			this.aborted = true;

			var response = new Ajax.Response(this);

			[ 'Abort', 'Complete' ].each(function(state) {
				try {
					(this.options['on' + state] || Prototype.emptyFunction)(response, response.headerJSON);
					Ajax.Responders.dispatch('on' + state, this, response, response.headerJSON);
				}
				catch (e) {
					this.dispatchException(e);
				}
			}, this);
		},

		retry: function(force) {
			if (force || this.isRetriable()) {
				var options = this.options || {};
				options._retryCount = (options._retryCount || 0) + 1;
				options.isRetry = true;
				options.previouslyAborted = this.aborted ? true : false;
				new Ajax.Request(this.url, options);
			}
		},

		isRetriable: function() {
			if (!this._complete) {
				return false;
			}

			var status = this.getStatus();
			var options = this.options || {};
			var maxRetries = options.maxRetries || 1;
			var retryCount = options._retryCount || 0;
			return (status == 408 || status > 10000 || this.aborted) && retryCount < maxRetries;
		}
	});
}
