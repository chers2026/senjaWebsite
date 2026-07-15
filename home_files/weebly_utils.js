Weebly = window.Weebly || {};
var currentBlog = {
	postId: 0,
	newPost: 0,
	title: '',
	categories: '',
	saving: 0,
	permalink: '',
	comments: '',
	date: ''
};

function done() {

	/* wat?
	if (!$('focusMe')) {
		var fm = document.createElement('input');
		fm.id = "focusMe";
		fm.style.border = "0";
		fm.style.height = "0px";
		fm.style.width = "0px";
		fm.style.overflow = "hidden";
		fm.style.position = "absolute";
		fm.style.top = "0px";
		fm.style.width = "0px";
		document.body.appendChild(fm);
	}
	$('focusMe').focus();
	*/

	return false;
}


var preloadedImages = Array();

var lastEventID;
lastEventID = Array();

function checkContentEditable() {
	var testEl = new Element('div');
	var oldIE = typeof testEl.contentEditable == 'undefined' || (typeof document.documentMode != 'undefined' && document.documentMode < 10);

	/*
		Later IE checks taken from:
		http://stackoverflow.com/questions/5574842/best-way-to-check-for-ie-less-than-9-in-javascript-without-library
	*/

	if (oldIE) {
		showError("<div style=\"text-align:center;\">"
			+ _W.utl('html.weebly.libraries.weebly_utils_18')
			+ "<br/><br/><div style='width:350px; margin:10px auto; background:#FEEFDA;'><a href='http://www.firefox.com' target='_blank' style='margin-right:15px;'><img src='http://www.ie6nomore.com/files/theme/ie6nomore-firefox.jpg' style='border: none;' alt='Get Firefox'/></a><a href='http://www.browserforthebetter.com/download.html' target='_blank' style='margin-right:15px;'><img src='http://www.ie6nomore.com/files/theme/ie6nomore-ie8.jpg' style='border: none;' alt='Get Internet Explorer'/></a><a href='http://www.apple.com/safari/download/' target='_blank' style='margin-right:15px;'><img src='http://www.ie6nomore.com/files/theme/ie6nomore-safari.jpg' style='border: none;' alt='Get Safari'/></a><a href='http://www.google.com/chrome' target='_blank'><img src='http://www.ie6nomore.com/files/theme/ie6nomore-chrome.jpg' style='border: none;' alt='Get Google Chrome'/></a></div></div>");
	}
}

Weebly.trackingArray = Array();

function fireTrackingEvent(category, action, optional_label, optional_value) {

	try {

		optional_value = optional_value ? optional_value : 0;

		if (!doTrackingEvent(category, action, optional_label, optional_value)) {
			throw ("Did not process tracking event");
		}

		if (Weebly.trackingArray.length > 0) {
			for ( var i = 0; i < Weebly.trackingArray.length; i++) {
				var c = Weebly.trackingArray[i];
				doTrackingEvent(c.category, c.action, c.optional_label, c.optional_value);
			}

			Weebly.trackingArray = Array();
		}
	}
	catch (e) {
		Weebly.trackingArray.push({
			'category': category,
			'action': action,
			'optional_label': optional_label,
			'optional_value': optional_value
		});
	}

}

function doTrackingEvent(category, action, optional_label, optional_value) {

	try {
		if (typeof window.gtag == 'function') {
			window.gtag('event', action, {
				'event_category': category,
				'event_label': optional_label,
				'value': parseInt(optional_value)
			});
		}
		mpmetrics.track(category, {
			'type': action
		});

	}
	catch (e) {
		return false;
	}

	return true;

}

function fireTransactionEvent(orderId, sku, price, affiliation, category) {

	try {
		if (typeof window.gtag == 'function') {
			// Converted to ga to gtag following:
			// https://developers.google.com/analytics/devguides/migration/ecommerce/analyticsjs-standard-ga4-to-ua
			window.gtag('event', 'purchase', {
				'transaction_id': orderId,
				'value': price,
				'affiliation': affiliation,
				'shipping': 0,
				'tax': 0,
				'items': [
					{
						'item_id': sku,
						'item_name': sku,
						'item_category': category,
						'price': price,
						'quantity': 1
					}
				]
			});
		}

		mpmetrics.track("Purchase " + category);
	}
	catch (e) {}

}


var errorDialog;

function showError(message, t, dontTrack) {

	if (typeof (message) == "string") {
		$('red-error-title').update(_W.utl('html.weebly.libraries.weebly_utils_3'));
		$('red-error-text').update(message);
	}
	else {
		$('red-error-title').update(message.title);
		$('red-error-text').update(message.message);
	}

	// only create if not yet existing
	if (!errorDialog) {
		errorDialog = new Weebly.Dialog($('red-error'), {
			inner_class: 'weebly-dialog-inner-red',
			zIndex: 9999,
			modal: 1
		});
	}

	errorDialog.open();
	if (!dontTrack) {
		fireTrackingEvent("WeeblyError", "Error", message);
	}
	var params = {
		pos: 'oopserror',
		message: message,
		token: Weebly.RequestToken
	};
	if (typeof (t) === 'object' && t.request) {
		params.ajax_request = t.request.body.match(/^.*?&cookie/)[0];
		params.ajax_response = t.responseText;
		params.ajax_status = t.status;
		params.server = t.getHeader('X-Host');
		if (t.request.times) {
			params.ajax_start = t.request.times.start;
			params.ajax_initialized = t.request.times.initialized;
			params.ajax_sent = t.request.times.sent;
			params.ajax_response_start = t.request.times.response;
			params.ajax_complete = (new Date().getTime() - t.request.times.start);
			params.current_upload = t.request.concurrentUpload ? 1 : 0;
		}
	}
	new Ajax.Request(ajax, {
		parameters: params,
		bgRequest: true
	});

	return errorDialog;
}

function hideError() {
	if (errorDialog) {
		errorDialog.close();
	}
}


var retriableErrorDialog;
var retriableAjax;

function showRetriableError(message, ajax, showX) {

	if (typeof (retriableErrorDialog) == 'object') {
		retriableErrorDialog.close();
	}

	var Branding = require('editor/Branding');

	var additionalMsg = !Branding.isWhiteLabeled() ? "<br/><br/>" + _W.utl('html.weebly.libraries.weebly_utils_4')
		: '';
	additionalMsg += "<br/><br/>";
	additionalMsg += "<a href='#' onclick='window.location.href=\"/editor/exitEditor.php"
		+ "\"' class='big-grey-button'><span class='button-inner'>" + _W.utl('html.weebly.libraries.weebly_utils_5')+ "</span></a>&nbsp;&nbsp;";
	additionalMsg += "<a href='#' onclick='retryRetriableError();' class='big-blue-button'><span class='button-inner'>" + _W.utl('html.weebly.libraries.weebly_utils_6')
		+ "</span></a>";

	if (typeof (message) == "string") {
		$('red-error-title').update(_W.utl('html.weebly.libraries.weebly_utils_7'));
		$('red-error-text').update(message + additionalMsg);
		fireTrackingEvent("WeeblyError", "Retriable Error", message);
	}
	else {
		$('red-error-title').update(message.title);
		$('red-error-text').update(message.message + additionalMsg);
		fireTrackingEvent("WeeblyError", "Retriable Error", message.message);
	}

	retriableErrorDialog = new Weebly.Dialog($('red-error'), {
		inner_class: 'weebly-dialog-inner-red',
		modal: 1,
		showClose: showX
	});
	retriableErrorDialog.open();

	try {
		var params = {
			pos: 'oopserror',
			message: typeof (message) == "string" ? message : message.message,
			token: Weebly.RequestToken
		};
		if (typeof (ajax) === 'object' && !ajax.body.match(/oopserror/)) {
			params.ajax_request = ajax.body.match(/^.*?&cookie/)[0];
			params.ajax_response = ajax.transport.responseText;
			params.ajax_status = ajax.transport.status;
			params.server = ajax.getHeader('X-Host');
			if (ajax.times) {
				params.ajax_start = ajax.times.start;
				params.ajax_initialized = ajax.times.initialized;
				params.ajax_sent = ajax.times.sent;
				params.ajax_response_start = ajax.times.response;
				params.ajax_complete = (new Date().getTime() - ajax.times.start);
				params.current_upload = 0;
			}
			new Ajax.Request('/weebly/getElements.php', {
				parameters: params,
				bgRequest: true
			});
			retriableAjax = ajax;
		}
	}
	catch (e) {

	}

	return retriableErrorDialog;
}

function retryRetriableError() {
	hideRetriableError();
	retriableAjax.retry(true);
}

function hideRetriableError() {
	if (retriableErrorDialog) {
		retriableErrorDialog.close();
	}
}

var warningDialog;

function showWarning(message, options) {

	options = Object.extend({
		width: '585px',
		titleFontSize: '36px',
		showClose: true,
		closeFunction: null
	}, options);

	$('orange-error').setStyle({
		width: options.width
	});
	$('orange-error-title').setStyle({
		fontSize: options.titleFontSize
	});

	if (typeof (message) == "string") {
		$('orange-error-title').update(_W.utl('html.weebly.libraries.weebly_utils_8'));
		$('orange-error-text').update(message);
		fireTrackingEvent("WeeblyError", "Warning", message);
	}
	else {
		$('orange-error-title').update(message.title);
		$('orange-error-text').update(message.message);
		fireTrackingEvent("WeeblyError", "Warning", message.message);
	}

	if (options.okButton) {
		$('orange-error-button').show().stopObserving('click').observe('click', function() {
			warningDialog.close();
		});
	}
	else {
		$('orange-error-button').hide();
	}

	warningDialog = new Weebly.Dialog($('orange-error'), {
		inner_class: 'weebly-dialog-inner-orange',
		modal: 1,
		showClose: options.showClose,
		closeFunction: options.closeFunction
	});
	warningDialog.open();

	return warningDialog;
}

function showDeniedAction( error ) {
	jQuery('orange-error-title').setStyle({ fontSize: '30px' }).update( 'Text Not Allowed' );
	jQuery('orange-error-text').setStyle({ marginTop: '25px', marginBottom: '25px' });

	var button = new Element('a', {
		'class': 'orange-button-29',
		'href': '#',
		'id': 'closeWarning'
	}).update( '<span class="bi">' + window._W.utl('html.weebly.libraries.weebly_utils_9') + '</span>' ).setStyle({ marginBottom: '10px' }).observe('click', function() {
		window.warningDialog.close();
		jQuery('closeWarning').hide();
	});

	jQuery('orange-error-text').insert({after: button});
	window.showWarning( error );
}

function hideWarning() {
	if (warningDialog) {
		warningDialog.close();
	}
}

var showDialogElement;
function showDialog(message, options) {
	options = options || {};

	if (!showDialogElement) {
		var content = new Element('div', {
			'id': 'showDialogElement',
			'class': 'orange-error weebly-text w-ui'
		});

		var html = '';

		if (options.title) {
			html +=
				"<div class='orange-error-heading'>" +
					"<span class='orange-error-title' style='font-size:24px'>" +
						options.title +
					"</span>" +
				"</div>";
		}

		html +=
			"<div class='orange-error-text'>" +
				message +
				"<div class='orange-error-buttons' style='margin-top:2em'></div>" +
			"</div>";

		content.update(html);

		showDialogElement = new Weebly.Dialog(content, {
			inner_class: 'weebly-dialog-inner-orange'
		});
	}

	showDialogElement.open();
}

var confirmDialog;
var lastConfirmOk = false;

function showConfirm(options) {

	var content;
	lastConfirmOk = false;

	if (!confirmDialog) {
		content = new Element('div', {
			'id': 'confirmDialogContent',
			'class': 'orange-error weebly-text w-ui'
		});
		confirmDialog = new Weebly.Dialog(content, {
			inner_class: 'weebly-dialog-inner-orange'
		});
	}
	else {
		content = $('confirmDialogContent');
	}

	confirmDialog.options.onClose = function() {
		if (!lastConfirmOk && options.onCancel) {
			options.onCancel();
		}
	};

	content.update("<div class='orange-error-heading'>" + "<div class='orange-error-title'>" + options.title + "</div>"
		+ "</div>" + "<div class='orange-error-text'>" + options.message + "<div class='orange-error-buttons' style='margin-top:2em'></div>"
		+ "</div>");

	var okButton = new Element('button', {
		'style': 'padding:.5em 1em;cursor:pointer',
		'class': 'btn btn-default'
	}).update(options.okText || 'OK').observe('click', function() {
		options.onConfirm();
		lastConfirmOk = true;
		confirmDialog.close();
	});

	var cancelButton = new Element('button', {
		'style': 'padding:.5em 1em;cursor:pointer',
		'class': 'btn btn-primary'
	}).update(options.cancelText || _W.utl('html.weebly.libraries.weebly_utils_10')).observe('click', function() {
		confirmDialog.close();
	});

	content.select('div.orange-error-buttons')[0].insert(okButton).insert(' ').insert(cancelButton);

	confirmDialog.open();

}


var whoisDialog;
function showUpdateWhois(serviceID, paymentType, userServiceID, sld, tld, years, initialData, closeFunction, successFunction) {
	$("CCState").value = $("whois-state").value;
	Event.fire($("CCState"), "liszt:updated");

	$('whois-complete').onclick = function() {
		submitWhois();
		return false;
	};
	$('whois-complete').style.opacity = '1';
	$('whois-complete').disabled = false;
	$('whois-error').innerHTML = "";

	var total = initialData && initialData.amountFormatted ? initialData.amountFormatted : (years * 10) + ".00";
	var yearlyAmountFormatted = initialData && initialData.yearlyAmountFormatted ? initialData.yearlyAmountFormatted : '$10';
	if(initialData && initialData.tax) {
		total += '<br><span class="whois-TaxAmount">(includes '+initialData.taxFormatted+' tax)</span>';
		$('whois-totalContainer').addClassName('has-tax');
	}
	$('whois-totalAmount').update(total);
	$('yearly-whois-price').update(yearlyAmountFormatted);
	$('whois-fields-domain').innerText = sld + "." + tld;
	$('whois-fields-userServiceID').value = userServiceID;

	if (serviceID.match(/customDomainWhois/)) {
		$('whoisProtectContainer-public').style.display = 'none';
		$('whoisProtect-public').name = "whois-blank";
		$('whoisProtectContainer-private').style.display = 'none';
		$('whoisProtect-private').name = "whois-blank";
		$('whoisProtectContainer-purchasedPrivate').style.display = 'block';
		$('whoisProtect-purchasedPrivate').name = "whois-protect";
	}
	else if (paymentType == "PayPal") {
		$('whoisProtectContainer-public').style.display = 'none';
		$('whoisProtect-public').name = "whois-blank";
		$('whoisProtectContainer-private').style.display = 'none';
		$('whoisProtect-private').name = "whois-blank";
		$('whoisProtect-purchasedPayPal').name = "whois-protect";
	}

	whoisDialog = new Weebly.Dialog($('update-whois'), {
		modal: 1,
		closeFunction: closeFunction || Weebly.goHome
	});
	whoisDialog.successFunction = successFunction;
	whoisDialog.open();

}

function submitWhois() {

	$('whois-complete').onclick = function() {
		return false;
	};
	$('whois-complete').style.opacity = '0.5';
	$('whois-complete').disabled = true;
	$('whois-error').innerHTML = "";

	var errorFields = [];
	var fields = [ 'whois-name', 'whois-email', 'whois-address', 'whois-city', 'whois-state', 'whois-zip', 'CCState', 'CCCountry', 'whois-phone' ];

	for ( var x = 0; x < fields.length; x++) {

		if (fields[x] != "CCCountry" && fields[x] != "CCState" || true) {
			$(fields[x]).parentNode.style.border = "1px solid #999";
		}

		if ($(fields[x]).value == "") {
			if ((fields[x] == "CCState" && $("CCCountry").value == 'US') || (fields[x] == "whois-state" && $("CCCountry").value != 'US')
				|| (fields[x] != "CCState" && fields[x] != "whois-state"))
				errorFields.push(fields[x]);
		}

		if (fields[x] == "whois-name" && !$(fields[x]).value.match(" ")) {
			errorFields.push(fields[x]);
		}
	}

	if (errorFields.length > 0) {

		for ( var x = 0; x < errorFields.length; x++) {
			$(errorFields[x]).parentNode.style.border = "1px solid red";
		}

		$('whois-complete').onclick = function() {
			submitWhois();
			return false;
		};
		$('whois-complete').style.opacity = '1';
		$('whois-complete').disabled = false;
		$('whois-error').innerHTML = _W.utl('html.weebly.libraries.weebly_utils_19');

	}
	else {

		//Do AJAX call here
		var params = $('whois-form').serialize(true); // true means return object
		params.pos = 'updatedomainwhois';
		params.token = Weebly.RequestToken;
		new Ajax.Request(ajax, {
			parameters: params,
			onSuccess: handlerSubmitWhois,
			onFailure: errFunc
		});

	}

}

function handlerSubmitWhois(t) {

	if (t.responseText.match("%%SUCCESS%")) {
		whoisDialog.close();
		if (whoisDialog.successFunction) {
			whoisDialog.successFunction();
		}
	}
	else {
		$('whois-complete').onclick = function() {
			submitWhois();
			return false;
		};
		$('whois-complete').style.opacity = '1';
		$('whois-complete').disabled = false;
		$('whois-error').innerHTML = t.responseText;
	}
}

function selectWhoisSetting(setting) {

	if (setting == "public") {
		$('whoisProtectContainer-private').removeClassName('multiple-choice-box-selected');
		$('whoisProtectContainer-public').addClassName('multiple-choice-box-selected');
		$('whoisProtect-public').checked = true;
		$('whois-totalContainer').style.display = 'none';
	}
	else {
		$('whoisProtectContainer-public').removeClassName('multiple-choice-box-selected');
		$('whoisProtectContainer-private').addClassName('multiple-choice-box-selected');
		$('whoisProtect-private').checked = true;
		$('whois-totalContainer').style.display = 'inline-block';
	}
}

function showError2(message) {
	$('errorText2').innerHTML = message;
	Effect.Appear('error2');
}

function hoverOn(hoverID, type) {
	if (isIn(lastEventID, hoverID)) {}
	else {
		if (settingTooltips == 1) {
			var text;
			if (type == 1) {
				text = _W.utl('html.weebly.libraries.weebly_utils_12');
			}
			if (type == 2) {
				text = _W.utl('html.weebly.libraries.weebly_utils_13');
			}
			if (type == 3) {
				text = _W.utl('html.weebly.libraries.weebly_utils_14');
			}
			showTip(text, hoverID, 'y', hoverID, 1);
			lastEventID.push(hoverID);
		}
		//var element = document.getElementById(hoverID);
		//element.className = element.className + "-hover";
	}
}

function hoverOff(hoverID) {
	if (settingTooltips == 1) {
		hideTip('tip' + hoverID);
	}
	//var element = document.getElementById(hoverID);
	//element.className = element.className.replace("-hover","");
	if (isIn(lastEventID, hoverID)) {
		lastEventID.splice(isIn(lastEventID, hoverID), 1);
	}
}

function preloadImages(images) {

	//console.log("preloadImages: "+images);

	var imagesArray = images.split(",");
	for ( var x = 0; x < imagesArray.length; x++) {
		var y = preloadedImages.length;
		preloadedImages[y] = new Image;
		preloadedImages[y].src = imagesArray[x];
	}

	//console.log(preloadedImages.length);

}

function duplicateStyle(origEl, newEl, containerEl) {
	// Write styles
	if (origEl.currentStyle) {
		//Only works in IE

		for ( var nsName in origEl.currentStyle) {
			var nsValue = origEl.currentStyle[nsName];
			if (nsValue != "" && !(nsValue instanceof Object) && nsName != "length" && nsName != "parentRule" && nsName != "display"
				&& !nsName.match(/border/) && !nsName.match(/margin/) && !nsName.match(/line/)) {
				//alert(nsName+":"+nsValue);
				//console.log("write!");
				if (nsName != "display" && !nsName.match(/border/) && !nsName.match(/margin/)) {
					newEl.style[nsName] = nsValue;
				}
				if (nsName != "width" && nsName != "height" && !nsName.match(/padding/) && !nsName.match(/border/)) {
					containerEl.style[nsName] = nsValue;
				}
			}
		}

	}
	else {
		// Only works for Non-IE

		var ns = document.defaultView.getComputedStyle(origEl, '');

		for ( var nsName in ns) {
			var nsValue = ns[nsName];
			//console.log("style "+ns[name]+"="+value);
			//alert("style "+ns[name]+"="+value);
			if (nsValue != "" && !(nsValue instanceof Object) && nsName != "length" && nsName != "parentRule" && nsName != "display"
				&& !nsName.match(/border/) && !nsName.match(/margin/)) {
				//console.log("write!");

				// Handle Safari
				if (nsName.match(/^[0-9]+$/)) {
					nsName = nsValue;
					nsValue = ns[nsName];

				}

				if (nsName != "cssText" && nsName != "display" && !nsName.match(/border/) && !nsName.match(/margin/) && !nsName.match(/webkit/)) {
					newEl.style[nsName] = nsValue;
					//if (nsName == "width") { alert(nsValue); alert(newEl.id); }
				}
				if (nsName != "width" && nsName != "height" && nsName != "maxWidth" && nsName != "maxHeight" && !nsName.match(/padding/)
					&& !nsName.match(/border/)) {
					containerEl.style[nsName] = nsValue;
				}
			}
		}
	}

	newEl.style.margin = "0";
	//newEl.style.padding = "0";

}

/**
 * http://www.openjs.com/scripts/events/keyboard_shortcuts/
 * Version : 2.01.A
 * By Binny V A
 * License : BSD
 */
shortcut = {
	'all_shortcuts': {},//All the shortcuts are stored in this array
	'add': function(shortcut_combination, callback, opt) {
		//Provide a set of default options
		var default_options = {
			'type': 'keydown',
			'propagate': false,
			'disable_in_input': false,
			'target': document,
			'keycode': false
		}
		if (!opt)
			opt = default_options;
		else {
			for ( var dfo in default_options) {
				if (typeof opt[dfo] == 'undefined')
					opt[dfo] = default_options[dfo];
			}
		}

		var ele = opt.target
		if (typeof opt.target == 'string')
			ele = document.getElementById(opt.target);
		var ths = this;
		shortcut_combination = shortcut_combination.toLowerCase();

		//The function to be called at keypress
		var func = function(e) {
			e = e || window.event;

			if (opt['disable_in_input']) { //Don't enable shortcut keys in Input, Textarea fields
				var element;
				if (e.target)
					element = e.target;
				else if (e.srcElement)
					element = e.srcElement;
				if (element.nodeType == 3)
					element = element.parentNode;

				if (element.tagName == 'INPUT' || element.tagName == 'TEXTAREA')
					return;
			}

			//Find Which key is pressed
			var code;
			if (e.keyCode)
				code = e.keyCode;
			else if (e.which)
				code = e.which;
			var character = String.fromCharCode(code).toLowerCase();

			if (code == 188)
				character = ","; //If the user presses , when the type is onkeydown
			if (code == 190)
				character = "."; //If the user presses , when the type is onkeydown

			var keys = shortcut_combination.split("+");
			//Key Pressed - counts the number of valid keypresses - if it is same as the number of keys, the shortcut function is invoked
			var kp = 0;

			//Work around for stupid Shift key bug created by using lowercase - as a result the shift+num combination was broken
			var shift_nums = {
				"`": "~",
				"1": "!",
				"2": "@",
				"3": "#",
				"4": "$",
				"5": "%",
				"6": "^",
				"7": "&",
				"8": "*",
				"9": "(",
				"0": ")",
				"-": "_",
				"=": "+",
				";": ":",
				"'": "\"",
				",": "<",
				".": ">",
				"/": "?",
				"\\": "|"
			}
			//Special Keys - and their codes
			var special_keys = {
				'esc': 27,
				'escape': 27,
				'tab': 9,
				'space': 32,
				'return': 13,
				'enter': 13,
				'backspace': 8,

				'scrolllock': 145,
				'scroll_lock': 145,
				'scroll': 145,
				'capslock': 20,
				'caps_lock': 20,
				'caps': 20,
				'numlock': 144,
				'num_lock': 144,
				'num': 144,

				'pause': 19,
				'break': 19,

				'insert': 45,
				'home': 36,
				'delete': 46,
				'end': 35,

				'pageup': 33,
				'page_up': 33,
				'pu': 33,

				'pagedown': 34,
				'page_down': 34,
				'pd': 34,

				'left': 37,
				'up': 38,
				'right': 39,
				'down': 40,

				'f1': 112,
				'f2': 113,
				'f3': 114,
				'f4': 115,
				'f5': 116,
				'f6': 117,
				'f7': 118,
				'f8': 119,
				'f9': 120,
				'f10': 121,
				'f11': 122,
				'f12': 123
			}

			var modifiers = {
				shift: {
					wanted: false,
					pressed: false
				},
				ctrl: {
					wanted: false,
					pressed: false
				},
				alt: {
					wanted: false,
					pressed: false
				},
				meta: {
					wanted: false,
					pressed: false
				}
			//Meta is Mac specific
			};

			if (e.ctrlKey)
				modifiers.ctrl.pressed = true;
			if (e.shiftKey)
				modifiers.shift.pressed = true;
			if (e.altKey)
				modifiers.alt.pressed = true;
			if (e.metaKey)
				modifiers.meta.pressed = true;

			for ( var i = 0; k = keys[i], i < keys.length; i++) {
				//Modifiers
				if (k == 'ctrl' || k == 'control') {
					kp++;
					modifiers.ctrl.wanted = true;

				}
				else if (k == 'shift') {
					kp++;
					modifiers.shift.wanted = true;

				}
				else if (k == 'alt') {
					kp++;
					modifiers.alt.wanted = true;
				}
				else if (k == 'meta') {
					kp++;
					modifiers.meta.wanted = true;
				}
				else if (k.length > 1) { //If it is a special key
					if (special_keys[k] == code)
						kp++;

				}
				else if (opt['keycode']) {
					if (opt['keycode'] == code)
						kp++;

				}
				else { //The special keys did not match
					if (character == k)
						kp++;
					else {
						if (shift_nums[character] && e.shiftKey) { //Stupid Shift key bug created by using lowercase
							character = shift_nums[character];
							if (character == k)
								kp++;
						}
					}
				}
			}

			if (kp == keys.length && modifiers.ctrl.pressed == modifiers.ctrl.wanted && modifiers.shift.pressed == modifiers.shift.wanted
				&& modifiers.alt.pressed == modifiers.alt.wanted && modifiers.meta.pressed == modifiers.meta.wanted) {
				callback(e);

				Event.stop(e);
				return false;
				if (!opt['propagate']) { //Stop the event
					/*
					//e.cancelBubble is supported by IE - this will kill the bubbling process.
					e.cancelBubble = true;
					e.returnValue = false;

					//e.stopPropagation works in Firefox.
					if (e.stopPropagation) {
						e.stopPropagation();
						e.preventDefault();
					}
					*/
					return false;
				}
			}

			return true;
		}
		this.all_shortcuts[shortcut_combination] = {
			'callback': func,
			'target': ele,
			'event': opt['type']
		};
		//Attach the function with the event
		if (ele.addEventListener)
			ele.addEventListener(opt['type'], func, false);
		else if (ele.attachEvent)
			ele.attachEvent('on' + opt['type'], func);
		else
			ele['on' + opt['type']] = func;
	},

	//Remove the shortcut - just specify the shortcut and I will remove the binding
	'remove': function(shortcut_combination) {
		shortcut_combination = shortcut_combination.toLowerCase();
		var binding = this.all_shortcuts[shortcut_combination];
		delete (this.all_shortcuts[shortcut_combination])
		if (!binding)
			return;
		var type = binding['event'];
		var ele = binding['target'];
		var callback = binding['callback'];

		if (ele.detachEvent)
			ele.detachEvent('on' + type, callback);
		else if (ele.removeEventListener)
			ele.removeEventListener(type, callback, false);
		else
			ele['on' + type] = false;
	}
}


Weebly.keyTracker = {};
window.disableBackspaceExit = true;
document.observe("keydown", function(e) {

	if (Event.element(e).hasClassName('editable-text')) {
		return;
	}
	if (e.keyCode)
		code = e.keyCode;
	else if (e.which)
		code = e.which;
	var character = String.fromCharCode(code).toLowerCase();

	var element;
	if (e.target)
		element = e.target;
	else if (e.srcElement)
		element = e.srcElement;
	if (element.nodeType == 3)
		element = element.parentNode;

	// Disable backspace making the webpage go back
	if (disableBackspaceExit && code == 8 && element.tagName != 'INPUT' && element.tagName != 'TEXTAREA') {
		e.keyCode = 0;
		event.keyCode = 0;
		e.returnValue = false;
		event.returnValue = false;
		Event.stop(e);
		return false;
	}

	Weebly.keyTracker[character] = 1;

	if (Weebly.keyTracker['p'] && Weebly.keyTracker['s'] && Weebly.keyTracker['u']) {
		showAbout();
	}
});

document.observe("keyup", function(e) {

	if (Event.element(e).hasClassName('editable-text')) {
		return;
	}
	if (e.keyCode)
		code = e.keyCode;
	else if (e.which)
		code = e.which;
	var character = String.fromCharCode(code).toLowerCase();

	Weebly.keyTracker[character] = 0;

});
//$.StealMouse
//The following block of code came from Robby Walker
//with minor modifications by David Rusenko

$.StealMouse = Class.create();
$.StealMouse.__class_name = '$.StealMouse';
$.StealMouse.prototype.__class_name = '$.StealMouse';
$_StealMouse = $.StealMouse;
Object.extend( $.StealMouse, {
	on: function __StealMouse_on_static(ifr) {
		ifr.__steal_mouseup = function(e) {
			$.StealMouse._sendMouseEvent(e, 'mouseup', ifr);
		};
		Event.observe(ifr.contentWindow.document, 'mouseup', ifr.__steal_mouseup);

		ifr.__steal_mousedown = function(e) {
			$.StealMouse._sendMouseEvent(e, 'mousedown', ifr);
		};
		Event.observe(ifr.contentWindow.document, 'mousedown', ifr.__steal_mousedown);

		ifr.__steal_mousemove = function(e) {
			$.StealMouse._sendMouseEvent(e, 'mousemove', ifr);
		};
		//Event.observe( ifr.contentWindow.document, 'mousemove', ifr.__steal_mousemove );

	},
	off: function __StealMouse_off_static() {
		Event.stopObserving(ifr.contentWindow.document, 'mouseup', ifr.__steal_mouseup);
		Event.stopObserving(ifr.contentWindow.document, 'mousedown', ifr.__steal_mousedown);
		Event.stopObserving(ifr.contentWindow.document, 'mousemove', ifr.__steal_mousemove);
	},
	_sendMouseEvent: function __StealMouse__sendMouseEvent_static(e, type, ifr) {

		//var p_cuml = [0,0];
		var p_cuml = Position.cumulativeOffset(ifr);
		var p_real = [ 0, 0 ];
		//var p_real = Position.realOffset( ifr );
		var p = {
			x: p_cuml[0] + p_real[0],
			y: p_cuml[1] + p_real[1]
		};

		if (document.createEvent) {
			var evObj = document.createEvent('MouseEvents');
			evObj.initMouseEvent(type, true, false, window, e.detail, e.screenX, e.screenY, e.clientX + p.x, e.clientY + p.y, e.ctrlKey, e.altKey,
				e.shiftKey, e.metaKey, e.button, null);
			//document.dispatchEvent(evObj);
			ifr.dispatchEvent(evObj);
		}
		else {
			var evObj = document.createEventObject();
			evObj.detail = e.detail;
			evObj.screenX = e.screenX;
			evObj.screenY = e.screenY;
			evObj.clientX = e.clientX + p.x;
			evObj.clientY = e.clientY + p.y;
			evObj.ctrlKey = e.ctrlKey;
			evObj.altKey = e.altKey;
			evObj.shiftKey = e.shiftKey;
			evObj.metaKey = e.metaKey;
			evObj.button = e.button;
			evObj.relatedTarget = e.relatedTarget;
			evObj.target = ifr;
			evObj.srcElement = ifr;
			//document.fireEvent('on' + type,evObj);
		}

		// Don't kill events in iFrame!
		//Event.stop( e );
	}
});

function tryStealMouse(iFrame) {

	var iFrameEl = document.getElementById(iFrame);

	if (iFrameEl && iFrameEl.contentWindow && iFrameEl.contentWindow.document && iFrameEl.contentWindow.document.body
		&& iFrameEl.contentWindow.document.body.innerHTML && iFrameEl.contentWindow.document.body.innerHTML != "") {
		//alert(iFrameEl.contentWindow.document.body.innerHTML);
		$.StealMouse.on(iFrameEl);
	}
	else {
		setTimeout("tryStealMouse('" + iFrame + "');", 250);
	}

}

// Determine whether an element is a parent node of another element
// Returns true if parentID is a parent of elementID
function isAParent(parentID, elementID) {

	if (typeof (elementID) != "object")
		elementID = $(elementID);
	if (typeof (parentID) != "object")
		parentID = $(parentID);

	if (elementID == parentID)
		return true;

	while (elementID.parentNode) {
		if (elementID.parentNode == parentID)
			return true;
		elementID = elementID.parentNode;
	}
	return false;

}

// Determine whether an element is a parent node of another element
// Returns true if parentID is a parent of elementID
function isAParentByClass(parentClass, elementID) {
	var parent;

	if (typeof (elementID) != "object")
		elementID = $(elementID);
	if (elementID.hasClassName(parentClass))
		return elementID;

	parent = elementID.up();
	while (parent && parent !== document) {
		if (parent.hasClassName(parentClass))
			return parent;

		elementID = parent;
		parent = elementID.up();
	}
	return false;
}

// Determine whether an element is a parent node of another element
// Returns true if parentID is a parent of elementID
function isAParentMatch(parentPattern, elementID) {

	// Convert to Element if it isn't already
	if (typeof (elementID) != "object")
		elementID = $(elementID);

	// Catch clicks inside iFrame
	if (typeof (elementID.id) != "string")
		return false;

	if (elementID.id.match(parentPattern))
		return elementID;

	while (elementID.id != 'body') {
		if (!elementID.parentNode)
			return false;
		if (elementID.parentNode && elementID.parentNode.id && elementID.parentNode.id.match && elementID.parentNode.id.match(parentPattern))
			return elementID.parentNode;
		elementID = elementID.parentNode;
	}
	return false;

}

function getXML(responseText) {
	var response = Try.these(function() {
		return new DOMParser().parseFromString(responseText, 'text/xml');
	}, function() {
		var xmldom = new ActiveXObject("Microsoft.XMLDOM");
		xmldom.loadXML(responseText);
		return xmldom;
	});

	return response;

}

function getValueXML(currentNode, tagName) {
	return currentNode.getElementsByTagName(tagName)[0].firstChild.nodeValue;
}

Weebly.on = {

	textIsChanging: 0,
	currentTextElement: null,
	currentTextCallBack: null,

	textChange: function(element, callback, length, lastValue) {

		element = $(element);
		if (!length) {
			length = 1500;
		}

		if (element != Weebly.on.currentTextElement && typeof (Weebly.on.currentTextElement) == "function") {
			Weebly.on.currentTextCallBack();
		}
		if (Weebly.on.currentTextElement == element && typeof (lastValue) == "undefined") {
			return;
		}

		if (typeof (lastValue) == "undefined") {
			// First iteration
			Weebly.on.currentTextElement = element;
			Weebly.on.currentTextCallBack = callback;
			Weebly.on.myFunction = Weebly.on.textChange.bind(Weebly.on.textChange, element, callback, length, element.value);
			setTimeout("Weebly.on.myFunction();", length);
		}
		else if (element && element.value && element.value == lastValue || (element.value == '' && lastValue == '')) {
			// User has stopped typing
			Weebly.on.currentTextCallBack(element.value);
			Weebly.on.currentTextElement = null;
			Weebly.on.currentTextCallBack = null;
		}
		else {
			// User is still typing
			Weebly.on.myFunction = Weebly.on.textChange.bind(Weebly.on.textChange, element, callback, length, element.value);
			setTimeout("Weebly.on.myFunction();", length);
		}

	}
};

function getInnerHeight() {

	var x, y;

	if (self.innerHeight) // all except Explorer
	{
		return self.innerHeight;
	}
	else if (document.documentElement && document.documentElement.clientHeight)
	// Explorer 6 Strict Mode
	{
		return document.documentElement.clientHeight;
	}
	else if (document.body) // other Explorers
	{
		return document.body.clientHeight;
	}

}

function isPro() {
	return Weebly.Restrictions.hasPro();
}

/**
 * Simliar to 'alertPremiumPurchase()' but instead is a modal notifying
 * the errors in their ways (too large file, pro element, etc).
 * This will display a link to either launch the Pro account window
 * or close the notification itself.
 *
 * @param {string} message A short message notifying the user.
 * @param {string} refer The location where this is called.
 * @param {number} level, the upgrade level required
 *
 */
function modalProFeatures(message, refer, level) {
	if (window.source == "reseller") {
		var ConfirmView = require('components/views/ConfirmView');
		editorApp.showDialog(
			new ConfirmView({
				title: _W.utl('html.weebly.libraries.weebly_utils_20'),
				message: message,
				confirmText: _W.utl('html.weebly.libraries.weebly_utils_21'),
				dialogClass: 'ui-dialog-overlay-wsite-dialog',
				callback: function(confirm) {
					if (confirm) {
						showPremiumPurchaseScreen({ refer:refer, level:level });
					}
				}
			})
		);
		return;
	}

	// if not reseller, use old pro upgrade modal
	var dialog = new Weebly.Dialog('pro-upgrade-modal', {
		modal: true,
		onClose: function() {
			// Clean up clock
			$("pro-upgrade-accept").stopObserving();
            $("pro-upgrade-okay").stopObserving();
		}
	});

	$("pro-upgrade-accept").observe("click", function(e) {
		dialog.close();
		showPremiumPurchaseScreen({ refer:refer, level:level });
        e.preventDefault();
	});

	$("pro-upgrade-okay").observe("click", function(e) {
		dialog.close();
        e.preventDefault();
	});

	$("pro-upgrade-modal-body").update(message);

	dialog.open();
}


var currentHref = document.location.href.replace(/#.*$/, "");
var firstTime = new Date().getTime();
var publishAfterPro = false;

function monitorHref(href) {
	var currentTime = new Date().getTime();
	if (currentTime < firstTime + 500) {
		return;
	}

	if (document.location.href != currentHref || href) {

		if (href) {
			var message = href;
		}
		else {
			var message = document.location.href.replace(/.*#/, "");
			document.location.href = document.location.href.replace(/(.*#)[^#]*$/, "$1");
			currentHref = document.location.href;
		}

		if (message.match('refresh')) {
			document.location.reload();
		}
		else if (message.match('addService')) {
			var service = message.replace('addService:', '');
			updateList();
		}
		else if (message == 'closePollDaddy') {
			if (Pages.openPages.indexOf('goBlogPost') > -1) {
				Pages.go('goBlogPost');
			}
			else {
				Pages.go("main");
			}
		}
	}
}


function alertPremiumFeature(restrictionID, refer) {
	showPremiumPurchaseScreen({
		restrictionID: restrictionID,
		refer: refer
	});
}


function showPremiumPurchaseScreen(options) {
	options = options || {};

	// show reseller payment popup if editing reseller site.
	if (window.source == 'reseller') {
		editorApp.billing.resellerPaymentRedirect(options);
		return;
	}

	if (Weebly.Developer && Weebly.Developer.isMaster) {
		editorApp.designer.showPlanChooser(
			function(plan){
				Weebly.Restrictions.level = plan;
			},
			options.level
		);
		return;
	}

	if (Weebly.Permissions && Weebly.Permissions.isContributor) {
		alert('The site owner must upgrade this site in order for this feature to be available.');
		return;
	}

	if (!options.level && options.restrictionID) {
		options.level = Weebly.Restrictions.requiredService(options.restrictionID);
		if(options.level == Weebly.Restrictions.freeLevel && Weebly.Restrictions.isUpgradable(options.restrictionID)) {
			options.level = Weebly.Restrictions.isUpgradable(options.restrictionID);
		}
	}

	if (!options.level && !options.type) {
		options.type = 'premium';
	}

	if (options.siteID === undefined) {
		if (window.location.href.match(/\/userHome\.php(\?|#|$)/)) {
			options.siteID = false;
		}
	}

	if (options.isPublishModal === true) {
		if (window.AragornAnalytics) {
			window.AragornAnalytics.track({
				type: 'standard',
				location: 'website.publish_tip_modal',
				object_category: 'upgrade_button',
				action: 'click',
				object_instance: options.refer.toLowerCase(),
			});
		}
	}

	showPurchaseScreen(options);
}


function showDesignerPurchaseScreen(refer) {
	showPurchaseScreen({
		type: Weebly.Restrictions.designerSitesService,
		refer: refer
	});
}


function showUpdateBillingScreen(refer, userServiceID, page, service, hideCard, deleteCard, extraArgs) {
	showPurchaseScreen({
		refer: refer,
		userServiceID: userServiceID,
		type: service || 'update',
		hideCard: hideCard,
		deleteCard: deleteCard,
		extraArgs: extraArgs
	});
}


function showPurchaseScreen(options) {
	options = options || {};
	var closeCallback = null;
	var secureUrl;

	if (options.closeCallback) {
		closeCallback = options.closeCallback;
	}

	if (options.type === 'protip' && window._W && window.editorApp) {
		var checkoutConfig = {
			unifiedCheckoutBase: window._W.UNIFIED_CHECKOUT_BASE,
		};
		var queryParameters = {
			siteID: window.editorApp.site.get('site_id'),
			level: options.level,
			refer: options.refer,
			restrictionID: options.restrictionID,
		};

		secureUrl = require('billing/utils/CheckoutUrl').buildUrl(checkoutConfig, queryParameters);
	} else {
		var url = '/weebly/apps/purchasePage.php' +
		"?s=" + encodeURIComponent(configSiteName) +
		(options.type ? "&type=" + encodeURIComponent(options.type) : "") +
		(options.level ? "&level=" + encodeURIComponent(options.level) : "") +
		(options.restrictionID ? "&restrictionID=" + encodeURIComponent(options.restrictionID) : "") +
		(options.refer ? "&refer=" + encodeURIComponent(options.refer) : "") +
		(options.siteID !== undefined ? "&siteID=" + encodeURIComponent(options.siteID) : "") + // might be true/false/<id>
		(options.forceComparison ? "&comparison=1" : "") +
		(options.userServiceID ? "&userServiceID=" + options.userServiceID : "") +
		(options.customTitle ? "&customTitle=" + options.customTitle : "") +
		(options.startTrial ? "&startTrial=1" : "") +
		(options.hideCard ? "&hideCard=" + options.hideCard : "") +
		(options.deleteCard ? "&deleteCard=" + options.deleteCard : "") +
		(options.extraArgs ? "&" + options.extraArgs : "");

		secureUrl = buildSecureUrl(url);
	}


	// this function is called in severall places, eg. onboarding/editor
	if (isProtocolSecure()) {
		require(['billing/views/BillingTakeoverView'], function(
			BillingTakeover
		) {
			var inAppBilling = new BillingTakeover({url: secureUrl});

			inAppBilling.open();
			inAppBilling.on('close', function() {
				closeCallback ? closeCallback() : loadLastTransaction();
			});
		});
	} else {
		var popup = window.open(secureUrl, '_blank');
			if (options.makePopupGlobal) {
				window.billingPopup = popup;
			}
			monitorBillingWindow(popup, closeCallback);
	}
}


function buildSecureUrl(url) {
	var secureBase = window.secureBase;
	if (secureBase && secureBase.length) {
		url = '/session-share?domain=' + encodeURIComponent(secureBase) +
			'&path=' + encodeURIComponent(url);
	}
	return url;
}


function monitorBillingWindow(bw, action) {
	action = action || function() {
		loadLastTransaction();
	}
	if (bw && bw.closed) {
		action();
	}
	else {
		setTimeout(function() {
			monitorBillingWindow(bw, action);
		}, 200);
	}
}

function loadLastTransaction(onComplete, lastTransaction) {

	if (preventAJAX()){ return; }

	onComplete = onComplete || function(){};

	new Ajax.Request(ajax, {
		parameters: {
			pos: 'getlasttransaction',
			transaction: JSON.stringify(lastTransaction),
			token: Weebly.RequestToken
		},
		onFailure: errFunc,
		onException: exceptionFunc,
		onSuccess: function(t) {
			var response = t.responseText;
			if (response.isJSON) {
				var json = response.evalJSON();
				if (json.action) {
					processLastTransaction(json);
				}
			}
		},
		onComplete: onComplete
	});
}

function fireBillingTransactionEvent(t, type) {
	fireTransactionEvent(t.transaction_id, t.service_id, t.amount, t.payment_type, type);
}

function processLastTransaction(t) {

	if(t.action && Weebly.Transactions && Weebly.Transactions[t.action]) {
		return Weebly.Transactions[t.action](t);
	}

	switch (t.action) {

		case 'successBillingPremium':
			fireBillingTransactionEvent(t, t.other_vars.plan.title);
			if (window.inEditor && inEditor()) {
				makePremium(t.other_vars.plan, t.service_id);
				if (isDomainChooserOpen) {
					domainChoiceContinue();
				}
				else if (Pages.openPages.indexOf('exportSite') > -1) {
					Pages.go('exportSite');
				}
				else if((!window.editorApp || !window.editorApp.isStorePanelOpen)
					&& Pages.openPages.indexOf('store') === -1) {
					Pages.go('main');
				}
				if (t.other_vars.freeDomainIssued) {
					hasDomainCredit = true;
				}
				// Bundled domain was purchased as well
				if (t.other_vars.bundled_domain) {
					fireBillingTransactionEvent(t, "Domain");
					var bundledDomain = t.other_vars.bundled_domain.domain;
					var fqdn = bundledDomain.fqdn;

					Weebly.Location.all_purchased_domains.push(fqdn);
					Weebly.Location.custom_domain = fqdn;
					Weebly.Location.purchased_domain = true;
					settingQuickExport = 1;
					domainDialog.close();
					domainChoiceFinish();
				}

				// Upgraded to pro or above when attempt to insert pro element
				// Dismiss upgrade warning dialog if upgraded to pro or above
				if (t.other_vars.plan.level >= 10) {
					editorApp.vent.trigger('billing:upgrade:proElement');
				} else if (t.other_vars.plan.level >= 5 ) {
					editorApp.vent.trigger('billing:upgrade:starter');
				}

				if (t.other_vars.plan.level > 0) {
					editorApp.vent.trigger('billing:upgrade:feature');
				}
			}
			else {
				window.location.reload();
			}
			break;

		case 'successBilling':
			fireBillingTransactionEvent(t, "Other");
			window.location.reload();
			break;

		case 'successBillingExtend':
			fireBillingTransactionEvent(t, "Extend");
			window.location.reload();
			break;

		case 'successBillingUpdate':
			if(typeof(editorApp) == 'object') {
				editorApp.vent.trigger('billing:profile:updated', t);
			} else if (homeApp && homeApp.vent){
				homeApp.vent.trigger('billing:profile:updated', t);
			}
			break;
		case 'successTrialPlanChange':
			window.location.reload();
			break;
		case 'successBillingDomainTransfer':
			window.useOwnDialog.close();
			if (window.inEditor && inEditor()) {
				var url = '/home/domains/transfers/'+t.other_vars.domain_transfer_model.domain_transfer_id;
				window.open(url, '_blank');
			}
			domainChoiceFinish();
			break;
		case 'successBillingDomain':
			if (t.other_vars.bundled_plan) {
				var plan = t.other_vars.bundled_plan;
				if (window.inEditor && inEditor()) {
					makePremium(plan.other_vars.plan, plan.other_vars.service_id);
				}
			}
			fireBillingTransactionEvent(t, "Domain");

			var fqdn = 'www.' + t.other_vars.sld + '.' + t.other_vars.tld;

			Weebly.Location.all_purchased_domains.push(fqdn);
			Weebly.Location.custom_domain = fqdn;
			Weebly.Location.purchased_domain = true;

			domainDialog.close();

			settingQuickExport = 1; // don't show the domain choosing window again on publish

			var initialData = {};
			if(t.other_vars.whoisTax) {
				initialData.tax = t.other_vars.whoisTax;
				initialData.amount = t.other_vars.whoisAmount;
			}
			domainChoiceFinish();
			break;

		case 'successStockMedia':
			fireBillingTransactionEvent(t, "StockMedia");
			stockMediaPurchased(t.other_vars.media_info);
			break;

		case 'successSimpleChat':
			if(typeof window.inEditor === 'function' && window.inEditor() && editorApp){
				editorApp.vent.triggerCascade('settings:general');
				updatList();
			} else if (homeApp && homeApp.vent){
				homeApp.vent.trigger('simplechat:purchase:success');
			}
			break;

		case 'designerBillingSetup':
			fireBillingTransactionEvent(t, "DesignerBilling");
			Weebly.Restrictions.designerBillingSetup = true;
			if (Weebly.AllDialogs['designer-billing-setup']) {
				Weebly.AllDialogs['designer-billing-setup'].close();
				if ($('designerBillingSuccessMessage')) {
					$('designerBillingSuccessMessage').show();
				}
				if (typeof (openDomainContainer) == 'function') {
					openDomainContainer();
				}
				else {
					exportSite();
				}
			}
			break;
	}
	if(t.other_vars && t.other_vars.plan && t.other_vars.plan.level) {
		var new_level = t.other_vars.plan.level;
		Weebly.Restrictions.level = new_level;
		if(typeof(editorApp) == 'object') {
			editorApp.vent.trigger('user:upgrade');
		}
	}
}

function removeService(userServiceId) {

	$('serviceError').innerHTML = '';
	new Ajax.Request(ajax, {
		parameters: {
			pos: 'removeservice',
			userServiceId: userServiceId,
			token: Weebly.RequestToken
		},
		onSuccess: function(t) {
			handlerRemoveService(t, userServiceId);
		},
		onFailure: errFunc
	});

}

function handlerRemoveService(t, userServiceId) {

	if (t.responseText.match('%%SUCCESS%%')) {

		$(userServiceId).innerHTML = "<em>This service has been removed.</em>";

	}
	else if (t.responseText.match('%%SUCCESSREFUND%%')) {

		$(userServiceId).innerHTML = "<em>"
			+ _W.utl('html.weebly.libraries.weebly_utils_16')
			+ "</em>";

	}
	else {

		$('serviceError').innerHTML = t.responseText;

	}

}

function onDropElements(element) {

	var inputElement = element.getElementsByTagName('input');
	if (inputElement && inputElement[0] && inputElement[0].value && inputElement[0].value.startsWith('def:')) {
		var elId = inputElement[0].value.match(/def:(\d*)/)[1];
		if (!allowProElementsTrial && !Weebly.Restrictions.hasAccess(elId)) {
			alertPremiumFeature(elId);
		}
	}
}

function deleteAccount() {
	new Ajax.Request(ajax, {
		parameters: {
			pos: 'deleteaccount',
			feedback: $("deleteAccountComments").value,
			email: $("deleteAccountEmailPref").checked,
			token: Weebly.RequestToken
		},
		onSuccess: handlerDeleteAccount,
		onFailure: errFunc
	});
}

function handlerDeleteAccount(t) {

	if (t.responseText.match("%%SUCCESS%%")) {
		document.location = '/index.html?account-deleted';
	}
}


var ElementExtensions = {
	center: function(element, limitX, limitY) {
		element = $(element);

		var elementDims = element.getDimensions();
		var viewPort = document.viewport.getDimensions();
		var offsets = document.viewport.getScrollOffsets();
		var centerX = viewPort.width / 2 + offsets.left - elementDims.width / 2;
		var centerY = viewPort.height / 2 + offsets.top - elementDims.height / 2;
		if (limitX && centerX < limitX) {
			centerX = parseInt(limitX);
		}
		if (limitY && centerY < limitY) {
			centerY = parseInt(limitY);
		}

		element.setStyle({
			position: 'absolute',
			top: Math.floor(centerY) + 'px',
			left: Math.floor(centerX) + 'px'
		});

		return element;
	},
	getInnerText: function(element) {
		return jQuery(element).text();
	},
	setInnerText: function(element, value) {
		return jQuery(element).text(value);
	}
};
Element.addMethods(ElementExtensions);

/********* Blog moderation functions ****************/

function goModerateBlog(blog_id, params, tab) { // params cannot and should not be an object!!! only string/number
	// params == 'ed_manage'

	currentBlog.saving = 0;
	currentBlog.blogId = blog_id;
	currentBlog.params = params;
	tab = tab || 'comments';

	new Ajax.Request(ajax, {
		parameters: {
			pos: 'blogmoderateblog',
			blogid: blog_id,
			params: params,
			token: Weebly.RequestToken
		},
		onFailure: errFunc,
		onException: exceptionFunc,
		onSuccess: handlerModerateBlog(tab)
	});
}

function handlerModerateBlog(tab) {
	return function(xhr) {
		var dialog = new Weebly.Dialog('blog-manage-' + tab + '-dialog', {
			modal: false,
			showClose: true,
			closeFunction: function() {
				dialog.close();
				Pages.go('main');
			}
		});
		dialog.open();
		currentBlog.settingsDialog = dialog;

		$('blog-manage-' + tab + '-dialog-content').update(xhr.responseText);
		if (tab == 'comments') {
			$('blog_moderation_iframe').addClassName('is-overlay');
			$$('.blog-moderation-filter a.all')[0].onclick();
		}
	}
}

function showBlogComments(type) {
	var $ = window.jQuery;

	if (type === null) {
		var $cur = $('.blog-moderation-filter a.selected');
		type = $cur.length ? $cur.attr('class').replace('selected', '').trim() : 'all';
	}

	// hide the delete/spam buttons in the deleted tab
	$('.js-delete-comment').toggle(type !== 'deleted');
	$('.js-spam-comment').toggle(type !== 'deleted' && type !== 'spam');

	var $blog = $('#site-blogs-select option:selected');
	var blogId = $blog.val();
	var siteId = $blog.data('site-id');
	var userId = $blog.data('user-id');

	$('.blog-moderation-filter a')
		.removeClass('selected')
		.filter('.' + type)
		.addClass('selected');

	$('#blog_moderation_iframe').attr({
		src: getBlogCommentsUrl(type, blogId, siteId, userId)
	});
}

function getBlogCommentsUrl(type, blogId, siteId, userId) {
	var params = new Hash({
		blog_id: blogId,
		type: type,
		site_id: siteId,
		user_id: userId,
		size: 'slim',
		r: parseInt(Math.random() * 99999999)
	});
	return 'viewBlogModeration.php?' + params.toQueryString();
}


function blogModerationAction(action) {
	var iframe = $('blog_moderation_iframe');
	if (!iframe) {
		return;
	}
	var win = iframe.contentWindow;
	if (!win) {
		return;
	}
	var fn = {
		'approve': win.approveComments,
		'delete': win.deleteComments,
		'spam': win.markSpamComments
	}
	if (fn[action]) {
		fn[action]();
	}
}

function changeUserLanguage(lang) {
	new Ajax.Request(ajax, {
		parameters: {
			pos: 'changeuserlanguage',
			lang: lang,
			token: Weebly.RequestToken
		},
		onFailure: errFunc
	});
}

function ieVersion() {
	var matches = navigator.appVersion.match(/MSIE.*?(\d+)/i);
	if (!matches) {
		return false;
	}
	return parseInt(matches[1]);
}

function clearPrefilledInput(input, default_value) {
	if (input.value == default_value) {
		input.value = '';
		$(input).setStyle({
			'color': ''
		});
	}
}

function getPagePermissionHtml(pages, currentHtml) {
	pages.each(function(page) {
		currentHtml += '<label>';
		// Individual Store pages and external pages can't be assigned to contributors but they may have child pages
		if (page.kind !== 'store' && page.extlink === '') {
			currentHtml += '<input type="checkbox" name="allowed_pages[]" value="' + page.id + '" /> ';
		} else {
			currentHtml += '-- ';
		}
		currentHtml += page.title + '</label>';
		if (page.children.size() > 0) {
			currentHtml += '<div class="subpages">';
			currentHtml = getPagePermissionHtml(page.children, currentHtml);
			currentHtml += '</div>';
		}
	});
	return currentHtml;
}

String.prototype.safeReplace = function(find, replacement) {
	return this.replace(find, (replacement + '').replace(/\$/g, '$$$$'));
};


_loadingLevel = 0;

// Keep a loading queue for when loading indicators get stuck
// only when debugging is enabled
if (window.W_DEBUG) {
	window.loadingQueue = [];
}

function pushLoading() {
	if (!_loadingLevel) {
		if ($('pleaseWait')) {
			jQuery('#pleaseWait').addClass("loading");
		}
	}

	if (window.W_DEBUG) {
		window.loadingQueue.push(arguments.callee.caller.toString());
	}

	_loadingLevel++;
}

function popLoading() {
	if (_loadingLevel > 0) {
		_loadingLevel--;
		if (window.W_DEBUG) {
			window.loadingQueue.pop();
		}
	}
	if (!_loadingLevel) {
		if ($('pleaseWait')) {
			jQuery('#pleaseWait').removeClass("loading");
		}
	}
}


function htmlEscape(s) {
	if (s === undefined || s === null)
		return '';
	else if (typeof s === "number")
		return s.toString();
	else
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#039;').replace(/"/g, '&quot;');
}


function eventStop(ev) {
	ev.stop();
}

function handleDesignerPublishCodes(t, site_id, container) {
	container = (container && $(container)) || $('exportText');
	if (t.responseText.match(/%%PURCHASESITES%%/)) {
		if (Weebly.AllDialogs['publishing-status']) {
			Weebly.AllDialogs['publishing-status'].close();
		}
		showDesignerBillingSetup();
	}
	if (t.responseText.match(/%%GOLIVEWARNING%%/)) {
		var dialogBox = container.up('.titled-box');
		container.show().innerHTML = $('designer-publish-message').innerHTML;
		Weebly.AllDialogs[dialogBox.id].positionDialog();
	}
	if (t.responseText.match(/%%CARDSETUPREQUIRED%%/)) {
		container.show().innerHTML = '<div style="font-family: Helvetica, Arial, Verdana, sans-serif; font-size: 16px; line-height:1.5; text-align:left; margin-bottom:10px;">Sites cannot be published live until the account holder has setup a credit card</div>';
	}
	if (t.responseText.match(/%%CANTCREATECHARGE%%/)) {
		container.show().innerHTML = 'Error:E119190'; //This shouldn't happen.  Go live button shouldn't exist
	}
}

function showDesignerBillingSetup() {
	if (Weebly.Restrictions.isDesignerMaster) {
		$('designer-billing-setup-body').update("Before publishing your first website live, you need to setup a billing method.");
		$('setup-buttons-master').show();
		$('setup-buttons-admin').hide();
	}
	else {
		$('designer-billing-setup-body')
				.update(
					_W.utl('html.weebly.libraries.weebly_utils_17'))
		$('setup-buttons-master').hide();
	}
	(new Weebly.Dialog($('designer-billing-setup'), {
		modal: true
	})).open();
}


function getInnerWidth(e) { // todo: rename???
	return e.offsetWidth - (parseInt(e.getStyle('border-left-width')) || 0) - (parseInt(e.getStyle('border-right-width')) || 0)
		- (parseInt(e.getStyle('padding-left')) || 0) - (parseInt(e.getStyle('padding-right')) || 0);
}

function ensureObject(o) {
	o = o || {};
	if (o.length === 0) {
		o = {};
	}
	return o;
}


/* Some functional utilities
------------------------------------------------------------------------------------------------*/

function hashEach(hash, func) {
	$H(hash).each(function(pair) {
		func(pair.key, pair.value);
	});
}

function hashMap(hash, func) {
	var res = {};
	$H(hash).each(function(pair) {
		res[pair.key] = func(pair.key, pair.value);
	});
	return res;
}

function hashSearch(hash, look) {
	if (!look) {
		return $H(hash).values()[0];
	}
	else if (typeof look == 'object') {
		for ( var key in hash) {
			var obj = hash[key];
			if (typeof obj == 'object') {
				for ( var lookKey in look) {
					var lookValue = look[lookKey];
					if (typeof lookValue != 'function') {
						if (obj[lookKey] == lookValue) {
							return obj;
						}
					}
				}
			}
		}
	}
	else {
		return hash[look];
	}
}

function arraySearch(array, look) {
	if (!look) {
		return array[0];
	}
	else if (typeof look == 'object') {
		for ( var i = 0; i < array.length; i++) {
			var obj = array[i];
			if (typeof obj == 'object') {
				for ( var lookKey in look) {
					var lookValue = look[lookKey];
					if (typeof lookValue != 'function') {
						if (obj[lookKey] == lookValue) {
							return obj;
						}
					}
				}
			}
		}
	}
}

function preventParentScroll(el) {
	attachMousewheelListener(el, function(e, delta) {
		Event.stop(e);
		el.scrollTop -= delta;
	});
}

function attachMousewheelListener(el, fn) {
	var handler = function(e) {
		var delta = (e.wheelDelta) ? e.wheelDelta / 4 : -(e.detail || 0);
		return fn.call(this, e, delta);
	};
	el.observe(getMousewheelEventName(), handler);
}

function getMousewheelEventName() {
	var cache_key = '_mousewheelEventName', event_key = 'mousewheel', event_dom = 'DOMMouseScroll';
	if (!window[cache_key]) {
		var el = document.createElement('div');
		window[cache_key] = (el['on' + event_key] !== undefined) ? event_key : event_dom;
		el = null;
	}
	return window[cache_key];
}


function getTextNodesIn(node, includeWhitespaceNodes) {
    var textNodes = [], whitespace = /^\s*$/;

    function getTextNodes(node) {
        if (node.nodeType == 3) {
            if (includeWhitespaceNodes || !whitespace.test(node.nodeValue)) {
                textNodes.push(node);
            }
        } else {
            for (var i = 0, len = node.childNodes.length; i < len; ++i) {
                getTextNodes(node.childNodes[i]);
            }
        }
    }

    getTextNodes(node);
    return textNodes;
}

function doEvent(event) {
	new Ajax.Request( ajax, {
		parameters: {
			pos: 'doevent',
			event: event,
			token: Weebly.RequestToken
		}
	});
}

/**
 * Supports the functionality of overriding a bounced email notice on userHome
 *
 * @param {Object} container
 * @param {String} email
 *
 * @return void
 */
function confirmBouncedEmail( container, email )
{
	var notificationId = container.getOffsetParent( ).id.replace( 'user-note-', '' );
	removeUserNote( notificationId );

	new Ajax.Request( ajax, {
		parameters: {
			pos: 'confirmBouncedEmail',
			email: email,
			token: Weebly.RequestToken
		}
	});
}


/**
 * Temp check to prevent ajax request for API
 * @return {bool} Editor and chromeless check
 */
function preventAJAX() {
	if (window.inEditor && inEditor()) {
		var Config = require('config');
		if (Config.chromeless ) {
			try {
				throw new Error('Invalid ajax request attempted in script');
			} catch(e) {
				console.log(e.message);
				return true;
			}
		}
	}
	return false;
}

/**
* Formats the money amount with currency symbol in locale specified
* NOTE: Safari and IE10- will need the Intl object polyfill
* The try...catch is used in cases where a locale is an invalid combination, such as en_A1
*
* @param {Mixed} amount
* @param {String} currencyType - "USD", "EUR" etc.
* @param {String} locale - "en-US", "de-DE" etc.
*
* @return {String}
*/
function formatMoney(amount, currencyType, locale) {
	var convertedAmount = '';
	var currencyType = currencyType || 'USD';
	var value = parseFloat(amount);
	// take locale from PHP and change it to a JS parseable version
	if (locale) {
		locale = locale.replace('_', '-');
	} else {
		locale = 'en-US';
	}
	// try converting with the given locale, if it doesn't work, try with 'en-US' so prices are correct
	try {
		convertedAmount = value.toLocaleString(locale, {style:'currency', currency: currencyType});
	}
	catch (e) {
		convertedAmount = value.toLocaleString('en-US', {style:'currency', currency: currencyType});
	}
	// Mexico wants to only show $ for Mexican pesos, but we always want to show MX$.
	// We replace MX$ and $ with MX$ to ensure this.
	if (currencyType == 'MXN') {
		convertedAmount = convertedAmount.replace(/(MX)?\$/, 'MX$');
	}
	// Canada wants to only show $ for Canadian Dollars, but we always want to show CA$.
	// We replace CA$ and $ with CA$ to ensure this.
	if (currencyType == 'CAD') {
		convertedAmount = convertedAmount.replace(/(CA)?\$/, 'CA$');
	}
	// Australia wants to only show $ for Australian dollars, but we always want to show A$.
	// We replace A$ and $ with A$ to ensure this.
	if (currencyType == 'AUD') {
		convertedAmount = convertedAmount.replace(/(A)?\$/, 'A$');
	}
	return convertedAmount;
}

function isProtocolSecure() {
	return document.location.protocol == 'https:';
}
